import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import {
  getEditableListing,
  isPublicStatus,
  listingImageKeys,
  revalidateListingCaches,
} from "@/lib/admin/access";
import { getSession } from "@/lib/auth";
import { listingAlt } from "@/lib/listings/media";
import { deleteObjects, getObjectBytes, putObject, R2NotConfiguredError } from "@/lib/r2";

/**
 * POST /api/images/verify — server safety net (CLAUDE.md §8a step 3), then saves the
 * `listing_images` row. Checks the uploaded objects really are clean WebP within limits;
 * anything else (or a fallback JPEG in incoming/) is re-encoded with sharp.
 */

export const maxDuration = 60;

const MAX_LARGE_BYTES = 1024 * 1024;
const LARGE_EDGE = 1600;
const THUMB_EDGE = 480;

const bodySchema = z.object({
  listingId: z.uuid(),
  uuid: z.uuid(),
  mode: z.enum(["webp", "fallback"]),
});

type Encoded = { data: Buffer; width: number; height: number };

async function encode(input: Uint8Array, edge: number, quality: number): Promise<Encoded> {
  const { data, info } = await sharp(input, { failOn: "error" })
    .rotate() // apply EXIF orientation; output carries no metadata
    .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** True when the object is WebP, small enough, within the size box and has no EXIF. */
async function isCleanWebp(bytes: Uint8Array, edge: number, maxBytes: number) {
  const meta = await sharp(bytes).metadata();
  const ok =
    meta.format === "webp" &&
    bytes.byteLength <= maxBytes &&
    !meta.exif &&
    (meta.width ?? Infinity) <= edge &&
    (meta.height ?? Infinity) <= edge;
  return { ok, width: meta.width ?? 0, height: meta.height ?? 0 };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { listingId, uuid, mode } = parsed.data;

  const listing = await getEditableListing(session, listingId);
  if (!listing) return NextResponse.json({ error: "You can't add photos to this listing." }, { status: 403 });

  const keys = listingImageKeys(listing.id, uuid);
  let large: { width: number; height: number; bytes: number };

  try {
    if (mode === "fallback") {
      const incomingKey = `incoming/${uuid}`;
      const original = await getObjectBytes(incomingKey);
      const [l, t] = await Promise.all([encode(original, LARGE_EDGE, 80), encode(original, THUMB_EDGE, 75)]);
      await Promise.all([putObject(keys.large, l.data, "image/webp"), putObject(keys.thumb, t.data, "image/webp")]);
      await deleteObjects([incomingKey]);
      large = { width: l.width, height: l.height, bytes: l.data.byteLength };
    } else {
      const [largeBytes, thumbBytes] = await Promise.all([getObjectBytes(keys.large), getObjectBytes(keys.thumb)]);
      const largeCheck = await isCleanWebp(largeBytes, LARGE_EDGE, MAX_LARGE_BYTES);
      if (largeCheck.ok) {
        large = { width: largeCheck.width, height: largeCheck.height, bytes: largeBytes.byteLength };
      } else {
        const l = await encode(largeBytes, LARGE_EDGE, 80);
        await putObject(keys.large, l.data, "image/webp");
        large = { width: l.width, height: l.height, bytes: l.data.byteLength };
      }
      const thumbCheck = await isCleanWebp(thumbBytes, THUMB_EDGE, MAX_LARGE_BYTES);
      if (!thumbCheck.ok) {
        const t = await encode(thumbBytes, THUMB_EDGE, 75);
        await putObject(keys.thumb, t.data, "image/webp");
      }
    }
  } catch (e) {
    if (e instanceof R2NotConfiguredError) {
      return NextResponse.json({ error: "Photo storage isn't set up yet (R2 keys missing)." }, { status: 503 });
    }
    console.error("images/verify failed", e);
    return NextResponse.json({ error: "That file isn't a usable photo." }, { status: 422 });
  }

  const { count } = await session.supabase
    .from("listing_images")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listing.id);

  const { data: row, error } = await session.supabase
    .from("listing_images")
    .insert({
      listing_id: listing.id,
      r2_key: keys.large,
      thumb_key: keys.thumb,
      width: large.width,
      height: large.height,
      bytes: large.bytes,
      format: "webp",
      alt_text: listingAlt(listing),
      sort_order: count ?? 0,
    })
    .select("id, r2_key, thumb_key, width, height, bytes, sort_order")
    .single();
  if (error || !row) {
    console.error("images/verify insert failed", error?.code, error?.message);
    await deleteObjects([keys.large, keys.thumb]).catch(() => {});
    return NextResponse.json({ error: "Couldn't save the photo." }, { status: 500 });
  }

  if (isPublicStatus(listing.status)) revalidateListingCaches(listing.slug);
  return NextResponse.json({ image: row });
}
