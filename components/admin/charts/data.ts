/** Chart data shapes + colours. Plain module: safe to import from Server Components. */
import { STATUS_LABELS } from "@/lib/admin/listingSchema";
import type { ListingStatus } from "@/lib/supabase/models";

export type EnquiryChannel = "whatsapp_click" | "call_click" | "form";
export type EnquiryDay = { label: string } & Record<EnquiryChannel, number>;
export type StatusSlice = { status: ListingStatus; label: string; value: number; color: string };

export const CHANNEL_SERIES: { key: EnquiryChannel; label: string; color: string }[] = [
  { key: "whatsapp_click", label: "WhatsApp", color: "#1f9d55" },
  { key: "call_click", label: "Call", color: "#0ea5e9" },
  { key: "form", label: "Form", color: "#0b2236" },
];

export const STATUS_COLORS: Record<ListingStatus, string> = {
  draft: "#b9c0c6",
  pending: "#f59e0b",
  available: "#1f9d55",
  reserved: "#0ea5e9",
  sold: "#0b2236",
  archived: "#ef4444",
};

const DAY_MS = 86_400_000;
const RIYADH = "Asia/Riyadh";

/** ISO timestamp `days` days ago. */
export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function dayKey(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: RIYADH }); // YYYY-MM-DD
}

/** Buckets enquiry rows into the last `days` days (Riyadh time), oldest first. */
export function enquiriesByDay(rows: { created_at: string; channel: string }[], days: number, now = new Date()): EnquiryDay[] {
  const buckets = new Map<string, EnquiryDay>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    buckets.set(dayKey(d), {
      label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: RIYADH }),
      whatsapp_click: 0,
      call_click: 0,
      form: 0,
    });
  }
  for (const r of rows) {
    const b = buckets.get(dayKey(new Date(r.created_at)));
    if (b && (r.channel === "whatsapp_click" || r.channel === "call_click" || r.channel === "form")) b[r.channel] += 1;
  }
  return [...buckets.values()];
}

export function statusSlices(counts: Record<ListingStatus, number>): StatusSlice[] {
  return (Object.keys(STATUS_LABELS) as ListingStatus[]).map((s) => ({
    status: s,
    label: STATUS_LABELS[s],
    value: counts[s],
    color: STATUS_COLORS[s],
  }));
}
