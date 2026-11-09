import type { Metadata } from "next";
import Link from "next/link";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { cardClass } from "@/components/admin/styles";
import { STATUS_LABELS } from "@/lib/admin/listingSchema";
import { requireUser } from "@/lib/auth";
import type { ListingStatus } from "@/lib/supabase/models";

export const metadata: Metadata = { title: "Dashboard" };

const STATUSES: ListingStatus[] = ["draft", "pending", "available", "reserved", "sold", "archived"];
const CHANNEL_LABEL: Record<string, string> = { form: "Form", whatsapp_click: "WhatsApp", call_click: "Call" };

export default async function DashboardPage() {
  const session = await requireUser();
  const { supabase, isOwner, userId } = session;

  let statusQuery = supabase.from("listings").select("status");
  if (!isOwner) statusQuery = statusQuery.eq("created_by", userId);

  let viewedQuery = supabase
    .from("listings")
    .select("id, ref_code, title_en, view_count, status")
    .in("status", ["available", "reserved", "sold"])
    .order("view_count", { ascending: false })
    .limit(5);
  if (!isOwner) viewedQuery = viewedQuery.eq("created_by", userId);

  const [{ data: statusRows }, { data: topViewed }, enquiries] = await Promise.all([
    statusQuery,
    viewedQuery,
    isOwner
      ? supabase
          .from("enquiries")
          .select("id, name, phone, channel, created_at, listings(id, ref_code, title_en)")
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: null }),
  ]);

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<ListingStatus, number>;
  for (const r of statusRows ?? []) counts[r.status] += 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">{isOwner ? "Dashboard" : "My listings"}</h1>
        <Link
          href="/admin/listings/new"
          className="inline-flex h-11 items-center rounded-full bg-accent-500 px-5 text-sm font-bold text-white hover:bg-accent-600"
        >
          ＋ New listing
        </Link>
      </div>

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STATUSES.map((s) => (
          <li key={s}>
            <Link href={`/admin/listings?status=${s}`} className={`${cardClass} block p-3 text-center hover:border-accent-500`}>
              <span className="block font-display text-2xl font-bold">{counts[s]}</span>
              <span className="block text-xs text-steel-500">{STATUS_LABELS[s]}</span>
            </Link>
          </li>
        ))}
      </ul>

      {isOwner && counts.pending > 0 ? (
        <Link
          href="/admin/listings?status=pending"
          className="block rounded-2xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900"
        >
          {counts.pending} listing{counts.pending === 1 ? "" : "s"} waiting for your approval →
        </Link>
      ) : null}

      {isOwner ? (
        <section className={cardClass}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Recent enquiries</h2>
            <Link href="/admin/enquiries" className="text-sm font-semibold text-accent-600">
              All →
            </Link>
          </div>
          {enquiries.data?.length ? (
            <ul className="divide-y divide-steel-100">
              {enquiries.data.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {e.listings ? `${e.listings.ref_code} · ${e.listings.title_en}` : "General enquiry"}
                    </span>
                    <span className="block text-xs text-steel-500">
                      {[e.name, e.phone].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </span>
                  <span className="shrink-0 text-end text-xs text-steel-500">
                    <span className="block font-semibold text-steel-700">{CHANNEL_LABEL[e.channel] ?? e.channel}</span>
                    {new Date(e.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-steel-500">No enquiries yet.</p>
          )}
        </section>
      ) : null}

      <section className={cardClass}>
        <h2 className="mb-2 font-display text-lg font-bold">Most viewed</h2>
        {topViewed?.length ? (
          <ul className="divide-y divide-steel-100">
            {topViewed.map((l) => (
              <li key={l.id}>
                <Link href={`/admin/listings/${l.id}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="text-steel-500">{l.ref_code}</span> {l.title_en}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <AdminStatusBadge status={l.status} />
                    <span className="w-14 text-end font-semibold">{l.view_count} 👁</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-steel-500">No published listings yet.</p>
        )}
      </section>
    </div>
  );
}
