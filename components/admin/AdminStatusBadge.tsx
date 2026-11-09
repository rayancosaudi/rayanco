import { STATUS_LABELS } from "@/lib/admin/listingSchema";
import type { ListingStatus } from "@/lib/supabase/models";

const styles: Record<ListingStatus, string> = {
  draft: "bg-steel-100 text-steel-700",
  pending: "bg-amber-100 text-amber-900",
  available: "bg-success text-white",
  reserved: "bg-warning text-white",
  sold: "bg-steel-900 text-white",
  archived: "bg-steel-200 text-steel-600",
};

export function AdminStatusBadge({ status }: { status: ListingStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.7rem] font-bold leading-none ${styles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
