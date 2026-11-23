import "server-only";
import { revalidateTag, updateTag } from "next/cache";
import type { AdminSession } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/listings/queries";
import { PUBLIC_STATUSES, type ListingStatus } from "@/lib/supabase/models";
import { STAFF_EDITABLE } from "./listingSchema";

export type EditableListing = {
  id: string;
  slug: string;
  status: ListingStatus;
  created_by: string | null;
  published_at: string | null;
  title_en: string;
  year: number | null;
  make: string | null;
  model: string | null;
  location: string | null;
};

/**
 * Loads a listing through the caller's RLS client and checks they may edit it:
 * owner → any listing; staff → their own while draft/pending.
 */
export async function getEditableListing(session: AdminSession, id: string): Promise<EditableListing | null> {
  const { data } = await session.supabase
    .from("listings")
    .select("id, slug, status, created_by, published_at, title_en, year, make, model, location")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  if (session.isOwner) return data;
  if (data.created_by === session.userId && STAFF_EDITABLE.includes(data.status)) return data;
  return null;
}

export function isPublicStatus(status: ListingStatus): boolean {
  return (PUBLIC_STATUSES as readonly ListingStatus[]).includes(status);
}

function listingTags(slugs: string[]): string[] {
  return [CACHE_TAGS.listings, CACHE_TAGS.sitemap, ...slugs.map(CACHE_TAGS.listing)];
}

/** From a Server Action: expire public marketplace caches now (read-your-writes). */
export function expireListingCaches(...slugs: string[]): void {
  for (const tag of listingTags(slugs)) updateTag(tag);
}

/** From a Route Handler (updateTag is Server Action–only). */
export function revalidateListingCaches(...slugs: string[]): void {
  for (const tag of listingTags(slugs)) revalidateTag(tag, { expire: 0 });
}

/** Storage keys (in the listing-media bucket) for a listing photo (CLAUDE.md §8a). */
export function listingImageKeys(listingId: string, uuid: string) {
  return {
    large: `listings/${listingId}/${uuid}.webp`,
    thumb: `listings/${listingId}/${uuid}_thumb.webp`,
  };
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
