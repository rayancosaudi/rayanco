import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Supabase Storage helpers. Server only: they use the service-role client, which
 * bypasses RLS, so callers must authorise the user first (see getEditableListing).
 * Buckets are created in supabase/migrations/20261123000001_storage.sql.
 */

export const MEDIA_BUCKET = "listing-media";
export const INCOMING_BUCKET = "listing-incoming";

export type SignedUpload = { bucket: string; path: string; token: string };

/** One-shot upload token. The bucket enforces the MIME type and size limit. */
export async function signUpload(bucket: string, path: string): Promise<SignedUpload> {
  const { data, error } = await createAdminClient().storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`createSignedUploadUrl failed: ${error?.message ?? "no data"}`);
  return { bucket, path: data.path, token: data.token };
}

export async function getObjectBytes(bucket: string, path: string): Promise<Uint8Array> {
  const { data, error } = await createAdminClient().storage.from(bucket).download(path);
  if (error || !data) throw new Error(`download ${bucket}/${path} failed: ${error?.message ?? "no data"}`);
  return new Uint8Array(await data.arrayBuffer());
}

export async function putObject(path: string, body: Uint8Array): Promise<void> {
  const { error } = await createAdminClient()
    .storage.from(MEDIA_BUCKET)
    .upload(path, body, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
  if (error) throw new Error(`upload ${path} failed: ${error.message}`);
}

export async function deleteObjects(bucket: string, paths: (string | null | undefined)[]): Promise<void> {
  const list = paths.filter((p): p is string => !!p);
  if (list.length === 0) return;
  const { error } = await createAdminClient().storage.from(bucket).remove(list);
  if (error) throw new Error(`remove from ${bucket} failed: ${error.message}`);
}

/** Paths in a bucket folder older than `maxAgeMs` (for the incoming/ cleanup cron). */
export async function listOlderThan(bucket: string, maxAgeMs: number): Promise<string[]> {
  const { data, error } = await createAdminClient().storage.from(bucket).list("", { limit: 1000 });
  if (error) throw new Error(`list ${bucket} failed: ${error.message}`);
  const cutoff = Date.now() - maxAgeMs;
  return (data ?? [])
    .filter((o) => o.id && o.created_at && new Date(o.created_at).getTime() < cutoff)
    .map((o) => o.name);
}
