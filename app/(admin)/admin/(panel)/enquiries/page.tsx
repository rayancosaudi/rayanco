import type { Metadata } from "next";
import Link from "next/link";
import { CHANNEL_OPTIONS, ChannelPill } from "@/components/admin/ChannelPill";
import { IconPhone } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/PageHeader";
import { cardClass, cardFlushClass, pillClass, tdClass, thClass, trClass } from "@/components/admin/styles";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: "Enquiries" };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" });

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ channel?: string }> }) {
  const { supabase } = await requireOwner();
  const { channel: rawChannel } = await searchParams;
  const channel = CHANNEL_OPTIONS.some((c) => c.value === rawChannel) ? rawChannel : undefined;

  let query = supabase
    .from("enquiries")
    .select("id, name, phone, message, channel, created_at, listings(id, ref_code, title_en)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (channel) query = query.eq("channel", channel);
  const { data: enquiries } = await query;

  const filters = [{ value: undefined, label: "All" }, ...CHANNEL_OPTIONS];

  return (
    <div>
      <PageHeader title="Enquiries" subtitle="Buyer contacts from listing pages: WhatsApp taps, call taps and the enquiry form." />

      <nav aria-label="Filter by channel" className="mb-5 overflow-x-auto">
        <ul className="flex gap-2">
          {filters.map((f) => (
            <li key={f.label}>
              <Link
                href={f.value ? `/admin/enquiries?channel=${f.value}` : "/admin/enquiries"}
                aria-current={f.value === channel ? "page" : undefined}
                className={pillClass(f.value === channel)}
              >
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {!enquiries?.length ? (
        <p className={`${cardClass} text-center text-sm text-steel-500`}>No enquiries yet.</p>
      ) : (
        <>
          {/* Desktop */}
          <div className={`${cardFlushClass} hidden md:block`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-steel-50">
                  <tr>
                    <th className={thClass}>Date</th>
                    <th className={thClass}>Listing</th>
                    <th className={thClass}>Buyer</th>
                    <th className={thClass}>Channel</th>
                    <th className={thClass}>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {enquiries.map((e) => (
                    <tr key={e.id} className={trClass}>
                      <td className={`${tdClass} whitespace-nowrap text-steel-500`}>{fmt(e.created_at)}</td>
                      <td className={`${tdClass} max-w-64`}>
                        {e.listings ? (
                          <Link href={`/admin/listings/${e.listings.id}`} className="block truncate font-semibold text-steel-900 hover:text-accent-600">
                            {e.listings.title_en}
                            <span className="block text-xs font-normal text-steel-500">{e.listings.ref_code}</span>
                          </Link>
                        ) : (
                          <span className="font-semibold text-steel-700">General enquiry</span>
                        )}
                      </td>
                      <td className={tdClass}>
                        <span className="block font-medium text-steel-900">{e.name ?? "—"}</span>
                        {e.phone ? (
                          <a href={`tel:${e.phone}`} dir="ltr" className="text-xs font-semibold text-accent-600 hover:underline">
                            {e.phone}
                          </a>
                        ) : null}
                      </td>
                      <td className={tdClass}>
                        <ChannelPill channel={e.channel} />
                      </td>
                      <td className={`${tdClass} max-w-sm`}>
                        <span className="line-clamp-2 text-steel-600" title={e.message ?? undefined}>
                          {e.message ?? "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile */}
          <ul className="space-y-3 md:hidden">
            {enquiries.map((e) => (
              <li key={e.id} className="rounded-xl bg-white p-4 text-sm shadow-[0_4px_20px_rgba(13,30,40,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {e.listings ? (
                      <Link href={`/admin/listings/${e.listings.id}`} className="block truncate font-semibold text-steel-900">
                        {e.listings.ref_code} · {e.listings.title_en}
                      </Link>
                    ) : (
                      <span className="font-semibold">General enquiry</span>
                    )}
                    <p className="mt-0.5 text-xs text-steel-500">{fmt(e.created_at)}</p>
                  </div>
                  <ChannelPill channel={e.channel} />
                </div>
                {e.name || e.phone ? (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="truncate text-steel-700">{e.name ?? ""}</span>
                    {e.phone ? (
                      <a
                        href={`tel:${e.phone}`}
                        dir="ltr"
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-accent-50 px-3 text-xs font-bold text-accent-700"
                      >
                        <IconPhone className="size-4" /> {e.phone}
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {e.message ? <p className="mt-3 whitespace-pre-line border-t border-steel-100 pt-3 text-steel-700">{e.message}</p> : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
