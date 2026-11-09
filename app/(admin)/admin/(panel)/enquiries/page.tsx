import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: "Enquiries" };

const CHANNEL_LABEL: Record<string, string> = { form: "Form", whatsapp_click: "WhatsApp tap", call_click: "Call tap" };

export default async function EnquiriesPage() {
  const { supabase } = await requireOwner();
  const { data: enquiries } = await supabase
    .from("enquiries")
    .select("id, name, phone, message, channel, created_at, listings(id, ref_code, title_en)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Enquiries</h1>
      {enquiries?.length ? (
        <ul className="space-y-2">
          {enquiries.map((e) => (
            <li key={e.id} className="rounded-2xl border border-steel-100 bg-white p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {e.listings ? (
                    <Link href={`/admin/listings/${e.listings.id}`} className="block truncate font-semibold text-steel-900 underline">
                      {e.listings.ref_code} · {e.listings.title_en}
                    </Link>
                  ) : (
                    <span className="font-semibold">General enquiry</span>
                  )}
                  <p className="text-steel-600">
                    {e.name ?? ""}
                    {e.phone ? (
                      <>
                        {e.name ? " · " : ""}
                        <a href={`tel:${e.phone}`} dir="ltr" className="font-semibold text-accent-600">
                          {e.phone}
                        </a>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="shrink-0 text-end text-xs text-steel-500">
                  <span className="block font-semibold text-steel-700">{CHANNEL_LABEL[e.channel] ?? e.channel}</span>
                  {new Date(e.created_at).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Riyadh",
                  })}
                </div>
              </div>
              {e.message ? <p className="mt-2 whitespace-pre-line text-steel-700">{e.message}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-steel-500">No enquiries yet.</p>
      )}
    </div>
  );
}
