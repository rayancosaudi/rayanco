import "server-only";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { serverEnv } from "@/lib/env.server";

/**
 * Cloudflare R2 (S3-compatible). Server only: the secret key never reaches the browser.
 * TODO(owner): create the bucket + API token, set R2_* in Vercel and .env.local,
 * add a CORS rule allowing PUT from the site origins with Content-Type,
 * and a lifecycle rule deleting `incoming/` objects after 1 day (CLAUDE.md §8a step 3).
 */

export class R2NotConfiguredError extends Error {
  constructor() {
    super("R2 is not configured: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.");
  }
}

function config() {
  const env = serverEnv();
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET) {
    throw new R2NotConfiguredError();
  }
  return {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_BUCKET,
  };
}

export function r2Configured(): boolean {
  try {
    config();
    return true;
  } catch {
    return false;
  }
}

let client: S3Client | undefined;

function s3() {
  const c = config();
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${c.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
  });
  return { client, bucket: c.bucket };
}

/**
 * Presigned PUT for one object. Content-Type and Content-Length are part of the signature,
 * so the browser must upload exactly that type and that many bytes.
 */
export async function presignPut(key: string, contentType: string, contentLength: number): Promise<string> {
  const { client, bucket } = s3();
  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: contentLength }),
    { expiresIn: 600, signableHeaders: new Set(["content-type", "content-length"]) },
  );
}

export async function getObjectBytes(key: string): Promise<Uint8Array> {
  const { client, bucket } = s3();
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error(`R2 object ${key} has no body`);
  return res.Body.transformToByteArray();
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const { client, bucket } = s3();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function deleteObjects(keys: (string | null | undefined)[]): Promise<void> {
  const list = keys.filter((k): k is string => !!k);
  if (list.length === 0) return;
  const { client, bucket } = s3();
  await client.send(
    new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: list.map((Key) => ({ Key })), Quiet: true } }),
  );
}
