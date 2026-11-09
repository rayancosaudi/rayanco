import { NextResponse } from "next/server";
import { z } from "zod";
import { getEditableListing, listingImageKeys } from "@/lib/admin/access";
import { getSession } from "@/lib/auth";
import { presignPut, R2NotConfiguredError } from "@/lib/r2";

/**
 * POST /api/upload-url — presigned PUT URLs for one listing photo (CLAUDE.md §8a step 2).
 * Normal path: two WebP objects (large + thumb), each ≤ 1 MB.
 * Fallback path (browser can't encode WebP): one JPEG to incoming/, converted by /api/images/verify.
 */

const MAX_WEBP_BYTES = 1024 * 1024;
const MAX_FALLBACK_BYTES = 15 * 1024 * 1024;

const bodySchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("webp"),
    listingId: z.uuid(),
    contentType: z.literal("image/webp"),
    largeBytes: z.number().int().positive().max(MAX_WEBP_BYTES),
    thumbBytes: z.number().int().positive().max(MAX_WEBP_BYTES),
  }),
  z.object({
    mode: z.literal("fallback"),
    listingId: z.uuid(),
    contentType: z.literal("image/jpeg"),
    bytes: z.number().int().positive().max(MAX_FALLBACK_BYTES),
  }),
]);

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Only WebP photos up to 1 MB can be uploaded." }, { status: 400 });
  }
  const body = parsed.data;

  const listing = await getEditableListing(session, body.listingId);
  if (!listing) return NextResponse.json({ error: "You can't add photos to this listing." }, { status: 403 });

  const uuid = crypto.randomUUID();
  try {
    if (body.mode === "webp") {
      const keys = listingImageKeys(listing.id, uuid);
      const [largeUrl, thumbUrl] = await Promise.all([
        presignPut(keys.large, "image/webp", body.largeBytes),
        presignPut(keys.thumb, "image/webp", body.thumbBytes),
      ]);
      return NextResponse.json({
        uuid,
        uploads: [
          { kind: "large", key: keys.large, url: largeUrl },
          { kind: "thumb", key: keys.thumb, url: thumbUrl },
        ],
      });
    }
    const key = `incoming/${uuid}`;
    const url = await presignPut(key, "image/jpeg", body.bytes);
    return NextResponse.json({ uuid, uploads: [{ kind: "incoming", key, url }] });
  } catch (e) {
    if (e instanceof R2NotConfiguredError) {
      return NextResponse.json({ error: "Photo storage isn't set up yet (R2 keys missing)." }, { status: 503 });
    }
    console.error("upload-url failed", e);
    return NextResponse.json({ error: "Couldn't prepare the upload." }, { status: 500 });
  }
}
