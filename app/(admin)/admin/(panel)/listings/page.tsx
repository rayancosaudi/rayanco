import type { Metadata } from "next";
import Link from "next/link";
import { IconPlus, IconSearch } from "@/components/admin/icons";
import { ListingsTable } from "@/components/admin/ListingsTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { btnPrimary, cardClass, pillClass } from "@/components/admin/styles";
import { STATUS_LABELS } from "@/lib/admin/listingSchema";
import { requireUser } from "@/lib/auth";
import type { ListingStatus } from "@/lib/supabase/models";

export const metadata: Metadata = { title: "Listings" };

const FILTERS: (ListingStatus | "all")[] = ["all", "draft", "pending", "available", "reserved", "sold", "archived"];

/** Strip characters that have meaning in a PostgREST `or()` filter. */
function cleanQuery(raw: string | undefined): string {
  return (raw ?? "").replace(/[,()%*\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mine?: string; q?: string }>;
}) {
  const session = await requireUser();
  const { status: rawStatus, mine, q: rawQ } = await searchParams;
  const status = FILTERS.includes(rawStatus as ListingStatus) ? (rawStatus as ListingStatus | "all") : "all";
  const onlyMine = !session.isOwner || mine === "1";
  const q = cleanQuery(rawQ);

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
  if (q) {
    const like = `%${q}%`;
    query = query.or(`title_en.ilike.${like},ref_code.ilike.${like},make.ilike.${like},model.ilike.${like},location.ilike.${like}`);
  }
  const { data: listings, error } = await query;
  if (error) console.error("admin listings query failed", error.code, error.message);

  const href = (next: { status?: string; mine?: boolean; q?: string }) => {
    const p = new URLSearchParams();
    const s = next.status ?? status;
    if (s !== "all") p.set("status", s);
    if (session.isOwner && (next.mine ?? mine === "1")) p.set("mine", "1");
    const nq = next.q ?? q;
    if (nq) p.set("q", nq);
    const qs = p.toString();
    return qs ? `/admin/listings?${qs}` : "/admin/listings";
  };

  return (
    <div>
      <PageHeader
        title={session.isOwner ? "All listings" : "My listings"}
        subtitle={`${listings?.length ?? 0} ${listings?.length === 1 ? "listing" : "listings"}${q ? ` matching “${q}”` : ""}`}
        actions={
          <Link href="/admin/listings/new" className={btnPrimary}>
            <IconPlus className="size-4" /> New listing
          </Link>
        }
      />

      <div className={`${cardClass} mb-5 space-y-4 !p-4`}>
        <form action="/admin/listings" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
          {session.isOwner && mine === "1" ? <input type="hidden" name="mine" value="1" /> : null}
          <label className="relative flex-1">
            <span className="sr-only">Search listings</span>
            <IconSearch className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-steel-400" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search title, ref, make, model, location…"
              className="h-11 w-full rounded-lg border border-steel-200 bg-steel-50 ps-10 pe-3 text-base placeholder:text-steel-400 focus:border-accent-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-accent-500/10 md:text-sm"
            />
          </label>
          {session.isOwner ? (
            <Link
              href={href({ mine: mine !== "1" })}
              aria-pressed={mine === "1"}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold ${
                mine === "1" ? "border-accent-500 bg-accent-50 text-accent-700" : "border-steel-200 text-steel-600 hover:bg-steel-50"
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid size-4 place-items-center rounded border text-[0.6rem] ${mine === "1" ? "border-accent-500 bg-accent-500 text-white" : "border-steel-300"}`}
              >
                {mine === "1" ? "✓" : ""}
              </span>
              Only mine
            </Link>
          ) : null}
        </form>

        <nav aria-label="Filter by status" className="-mx-4 overflow-x-auto px-4 pb-0.5">
          <ul className="flex gap-2">
            {FILTERS.map((f) => (
              <li key={f}>
                <Link href={href({ status: f })} aria-current={f === status ? "page" : undefined} className={pillClass(f === status)}>
                  {f === "all" ? "All" : STATUS_LABELS[f]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {listings?.length ? (
        <ListingsTable rows={listings} />
      ) : (
        <div className={`${cardClass} text-center`}>
          <p className="text-sm text-steel-500">{q ? "No listings match your search." : "No listings here yet."}</p>
          <Link href={q ? href({ q: "" }) : "/admin/listings/new"} className="mt-3 inline-block text-sm font-semibold text-accent-600 hover:underline">
            {q ? "Clear search" : "Add a listing"}
          </Link>
        </div>
      )}
    </div>
  );
}
