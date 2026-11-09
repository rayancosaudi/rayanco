import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { STATUS_LABELS } from "@/lib/admin/listingSchema";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/listings/media";
import type { ListingStatus } from "@/lib/supabase/models";

export const metadata: Metadata = { title: "Listings" };

const FILTERS: (ListingStatus | "all")[] = ["all", "draft", "pending", "available", "reserved", "sold", "archived"];

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<{ status?: string; mine?: string }> }) {
  const session = await requireUser();
  const { status: rawStatus, mine } = await searchParams;
  const status = FILTERS.includes(rawStatus as ListingStatus) ? (rawStatus as ListingStatus | "all") : "all";
  const onlyMine = !session.isOwner || mine === "1";

  let query = session.supabase
    .from("listings")
    .select(
      "id, ref_code, title_en, year, location, status, updated_at, view_count, categories(name_en), listing_images(thumb_key, r2_key, sort_order)",
    )
    .order("updated_at", { ascending: false })
    .order("sort_order", { referencedTable: "listing_images", ascending: true })
    .limit(1, { referencedTable: "listing_images" })
    .limit(200);
  if (status !== "all") query = query.eq("status", status);
  if (onlyMine) query = query.eq("created_by", session.userId);
  const { data: listings, error } = await query;
  if (error) console.error("admin listings query failed", error.code, error.message);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">{session.isOwner ? "All listings" : "My listings"}</h1>

      <nav aria-label="Filter by status" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {FILTERS.map((f) => (
            <li key={f}>
              <Link
                href={f === "all" ? "/admin/listings" : `/admin/listings?status=${f}`}
                aria-current={f === status ? "page" : undefined}
                className={`inline-flex h-9 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold ${
                  f === status ? "bg-steel-900 text-white" : "border border-steel-200 bg-white text-steel-700"
                }`}
              >
                {f === "all" ? "All" : STATUS_LABELS[f]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {listings?.length ? (
        <ul className="space-y-2">
          {listings.map((l) => {
            const cover = l.listing_images[0];
            return (
              <li key={l.id}>
                <Link
                  href={`/admin/listings/${l.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-steel-100 bg-white p-2 hover:border-accent-500"
                >
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-steel-100">
                    {cover ? (
                      <Image
                        src={mediaUrl(cover.thumb_key ?? cover.r2_key)}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="grid size-full place-items-center text-xl text-steel-300">📷</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{l.title_en}</p>
                    <p className="truncate text-xs text-steel-500">
                      {[l.ref_code, l.categories?.name_en, l.year, l.location].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <AdminStatusBadge status={l.status} />
                    <span className="text-xs text-steel-400">{l.view_count} views</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-steel-500">
          No listings here yet.{" "}
          <Link href="/admin/listings/new" className="font-semibold text-accent-600 underline">
            Add one
          </Link>
        </p>
      )}
    </div>
  );
}
