import { NextResponse } from "next/server";
import { z } from "zod";
import { getEditableListing, listingImageKeys } from "@/lib/admin/access";
import { getSession } from "@/lib/auth";
import { INCOMING_BUCKET, MEDIA_BUCKET, signUpload } from "@/lib/storage";

/**
 * POST /api/upload-url — signed upload tokens for one listing photo (CLAUDE.md §8a step 2).
 * Normal path: two WebP objects (large + thumb), each ≤ 1 MB.
 * Fallback path (browser can't encode WebP): one JPEG to the listing-incoming bucket, converted by /api/images/verify.
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
      const [large, thumb] = await Promise.all([
        signUpload(MEDIA_BUCKET, keys.large),
        signUpload(MEDIA_BUCKET, keys.thumb),
      ]);
      return NextResponse.json({
        uuid,
        uploads: [
          { kind: "large", ...large },
          { kind: "thumb", ...thumb },
        ],
      });
    }
    const incoming = await signUpload(INCOMING_BUCKET, uuid);
    return NextResponse.json({ uuid, uploads: [{ kind: "incoming", ...incoming }] });
  } catch (e) {
    console.error("upload-url failed", e);
    return NextResponse.json({ error: "Couldn't prepare the upload." }, { status: 500 });
  }
}
