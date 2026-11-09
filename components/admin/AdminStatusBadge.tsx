import { STATUS_LABELS } from "@/lib/admin/listingSchema";
import type { ListingStatus } from "@/lib/supabase/models";

/** Tinted pill, PlainAdmin style. */
const styles: Record<ListingStatus, string> = {
  draft: "bg-steel-100 text-steel-600",
  pending: "bg-amber-100 text-amber-800",
  available: "bg-accent-500/10 text-accent-700",
  reserved: "bg-sky-500/10 text-sky-700",
  sold: "bg-steel-900 text-white",
  archived: "bg-red-500/10 text-red-700",
};

export function AdminStatusBadge({ status }: { status: ListingStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${styles[status]}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABELS[status]}
    </span>
  );
}
