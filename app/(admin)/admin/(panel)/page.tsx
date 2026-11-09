import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { EnquiriesChart, StatusDonut } from "@/components/admin/charts";
import { CHANNEL_SERIES, daysAgoIso, enquiriesByDay, statusSlices } from "@/components/admin/charts/data";
import { ChannelPill } from "@/components/admin/ChannelPill";
import { IconCamera, IconCheckCircle, IconClock, IconDraft, IconMail, IconPlus, IconTag } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { btnPrimary, cardClass, cardFlushClass, cardTitleClass, tdClass, thClass, trClass } from "@/components/admin/styles";
import { requireUser } from "@/lib/auth";
import { mediaUrl } from "@/lib/listings/media";
import type { ListingStatus } from "@/lib/supabase/models";

export const metadata: Metadata = { title: "Dashboard" };

const STATUSES: ListingStatus[] = ["draft", "pending", "available", "reserved", "sold", "archived"];
const CHART_DAYS = 30;

export default async function DashboardPage() {
  const session = await requireUser();
  const { supabase, isOwner, userId } = session;
  const since = daysAgoIso(CHART_DAYS);

  let statusQuery = supabase.from("listings").select("status");
  if (!isOwner) statusQuery = statusQuery.eq("created_by", userId);

  let viewedQuery = supabase
    .from("listings")
    .select("id, ref_code, title_en, view_count, status, listing_images(thumb_key, r2_key, sort_order)")
    .in("status", ["available", "reserved", "sold"])
    .order("view_count", { ascending: false })
    .order("sort_order", { referencedTable: "listing_images", ascending: true })
    .limit(1, { referencedTable: "listing_images" })
    .limit(6);
  if (!isOwner) viewedQuery = viewedQuery.eq("created_by", userId);

  const [{ data: statusRows }, { data: topViewed }, recent, chartRows] = await Promise.all([
    statusQuery,
    viewedQuery,
    isOwner
      ? supabase
          .from("enquiries")
          .select("id, name, phone, channel, created_at, listings(id, ref_code, title_en)")
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: null }),
    isOwner
      ? supabase.from("enquiries").select("created_at, channel").gte("created_at", since).limit(5000)
      : Promise.resolve({ data: null }),
  ]);

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<ListingStatus, number>;
  for (const r of statusRows ?? []) counts[r.status] += 1;
  const total = statusRows?.length ?? 0;

  const days = enquiriesByDay(chartRows.data ?? [], CHART_DAYS);
  const enquiryTotal = chartRows.data?.length ?? 0;
  const channelTotals = CHANNEL_SERIES.map((s) => ({ ...s, value: days.reduce((n, d) => n + d[s.key], 0) }));
  const slices = statusSlices(counts);

  const firstName = session.profile.full_name.split(/\s+/)[0];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle={isOwner ? "Here's what's happening across the marketplace." : "Your listings at a glance."}
        actions={
          <Link href="/admin/listings/new" className={btnPrimary}>
            <IconPlus className="size-4" /> New listing
          </Link>
        }
      />

      {isOwner && counts.pending > 0 ? (
        <Link
          href="/admin/listings?status=pending"
          className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900 hover:bg-amber-100"
        >
          <IconClock className="size-5 shrink-0" />
          <span className="flex-1">
            {counts.pending} listing{counts.pending === 1 ? " is" : "s are"} waiting for your approval
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isOwner ? (
          <>
            <StatCard tone="green" icon={<IconCheckCircle />} label="Available" value={counts.available} sub={`${counts.reserved} reserved`} href="/admin/listings?status=available" />
            <StatCard tone="amber" icon={<IconClock />} label="Pending approval" value={counts.pending} sub={`${counts.draft} drafts in progress`} href="/admin/listings?status=pending" />
            <StatCard tone="steel" icon={<IconTag />} label="Sold" value={counts.sold} sub={`${total} listings in total`} href="/admin/listings?status=sold" />
            <StatCard tone="blue" icon={<IconMail />} label="Enquiries" value={enquiryTotal} sub={`Last ${CHART_DAYS} days`} href="/admin/enquiries" />
          </>
        ) : (
          <>
            <StatCard tone="purple" icon={<IconDraft />} label="Drafts" value={counts.draft} sub="Not submitted yet" href="/admin/listings?status=draft" />
            <StatCard tone="amber" icon={<IconClock />} label="Waiting for approval" value={counts.pending} href="/admin/listings?status=pending" />
            <StatCard tone="green" icon={<IconCheckCircle />} label="Live" value={counts.available + counts.reserved} sub="Available or reserved" href="/admin/listings?status=available" />
            <StatCard tone="steel" icon={<IconTag />} label="Sold" value={counts.sold} href="/admin/listings?status=sold" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {isOwner ? (
          <section className={`${cardClass} lg:col-span-2`}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className={cardTitleClass}>Buyer enquiries</h2>
                <p className="text-sm text-steel-500">Last {CHART_DAYS} days, by channel</p>
              </div>
              <ul className="flex flex-wrap gap-4">
                {channelTotals.map((c) => (
                  <li key={c.key} className="text-end">
                    <span className="block font-display text-xl font-bold text-steel-900">{c.value}</span>
                    <span className="flex items-center gap-1.5 text-xs text-steel-500">
                      <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="h-72">
              <EnquiriesChart data={days} />
            </div>
          </section>
        ) : null}

        <section className={`${cardClass} ${isOwner ? "" : "lg:col-span-1"}`}>
          <h2 className={cardTitleClass}>Listings by status</h2>
          <p className="text-sm text-steel-500">{isOwner ? "All listings" : "Your listings"}</p>
          {total ? (
            <>
              <div className="relative mx-auto mt-4 h-48 max-w-48">
                <StatusDonut data={slices} />
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <span>
                    <span className="block font-display text-3xl font-bold text-steel-900">{total}</span>
                    <span className="text-xs text-steel-500">listings</span>
                  </span>
                </div>
              </div>
              <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {slices.map((s) => (
                  <li key={s.status}>
                    <Link href={`/admin/listings?status=${s.status}`} className="flex items-center gap-2 hover:text-accent-600">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="flex-1 truncate text-steel-600">{s.label}</span>
                      <span className="font-semibold text-steel-900">{s.value}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyState text="No listings yet." />
          )}
        </section>

        {!isOwner ? <TopViewed listings={topViewed ?? []} className="lg:col-span-2" /> : null}
      </div>

      {/* Tables */}
      {isOwner ? (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className={cardFlushClass}>
            <div className="flex items-center justify-between px-6 pb-3 pt-5">
              <h2 className={cardTitleClass}>Recent enquiries</h2>
              <Link href="/admin/enquiries" className="text-sm font-semibold text-accent-600 hover:underline">
                View all
              </Link>
            </div>
            {recent.data?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-steel-50">
                    <tr>
                      <th className={thClass}>Listing</th>
                      <th className={thClass}>Buyer</th>
                      <th className={thClass}>Channel</th>
                      <th className={`${thClass} text-end`}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.data.map((e) => (
                      <tr key={e.id} className={trClass}>
                        <td className={`${tdClass} max-w-56`}>
                          {e.listings ? (
                            <Link href={`/admin/listings/${e.listings.id}`} className="block truncate font-semibold text-steel-900 hover:text-accent-600">
                              {e.listings.title_en}
                              <span className="block text-xs font-normal text-steel-500">{e.listings.ref_code}</span>
                            </Link>
                          ) : (
                            <span className="font-semibold text-steel-700">General enquiry</span>
                          )}
                        </td>
                        <td className={`${tdClass} text-steel-600`}>{[e.name, e.phone].filter(Boolean).join(" · ") || "—"}</td>
                        <td className={tdClass}>
                          <ChannelPill channel={e.channel} />
                        </td>
                        <td className={`${tdClass} whitespace-nowrap text-end text-steel-500`}>
                          {new Date(e.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Riyadh" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 pb-6">
                <EmptyState text="No enquiries yet. They appear here when buyers tap WhatsApp, Call or send the form." />
              </div>
            )}
          </section>

          <TopViewed listings={topViewed ?? []} />
        </div>
      ) : null}
    </div>
  );
}

type TopViewedListing = {
  id: string;
  ref_code: string;
  title_en: string;
  view_count: number;
  status: ListingStatus;
  listing_images: { thumb_key: string | null; r2_key: string }[];
};

function TopViewed({ listings, className = "" }: { listings: TopViewedListing[]; className?: string }) {
  return (
    <section className={`${cardFlushClass} ${className}`}>
      <div className="flex items-center justify-between px-6 pb-3 pt-5">
        <h2 className={cardTitleClass}>Most viewed</h2>
        <Link href="/admin/listings" className="text-sm font-semibold text-accent-600 hover:underline">
          All listings
        </Link>
      </div>
      {listings.length ? (
        <ul>
          {listings.map((l) => {
            const cover = l.listing_images[0];
            return (
              <li key={l.id} className="border-t border-steel-100">
                <Link href={`/admin/listings/${l.id}`} className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-steel-50/70">
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-steel-100">
                    {cover ? (
                      <Image src={mediaUrl(cover.thumb_key ?? cover.r2_key)} alt="" fill sizes="44px" className="object-cover" unoptimized />
                    ) : (
                      <span className="grid size-full place-items-center text-steel-300">
                        <IconCamera className="size-5" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-steel-900">{l.title_en}</span>
                    <span className="block text-xs text-steel-500">{l.ref_code}</span>
                  </span>
                  <AdminStatusBadge status={l.status} />
                  <span className="w-16 shrink-0 text-end text-sm font-bold text-steel-900">
                    {l.view_count}
                    <span className="block text-[0.7rem] font-normal text-steel-500">views</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="px-6 pb-6">
          <EmptyState text="No published listings yet." />
        </div>
      )}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="mt-4 rounded-lg bg-steel-50 px-4 py-6 text-center text-sm text-steel-500">{text}</p>;
}
