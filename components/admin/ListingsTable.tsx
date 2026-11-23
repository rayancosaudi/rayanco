import Image from "next/image";
import Link from "next/link";
import { mediaUrl } from "@/lib/listings/media";
import type { ListingStatus } from "@/lib/supabase/models";
import { AdminStatusBadge } from "./AdminStatusBadge";
import { IconCamera, IconChevronEnd } from "./icons";
import { cardFlushClass, tdClass, thClass, trClass } from "./styles";

export type ListingRow = {
  id: string;
  ref_code: string;
  title_en: string;
  year: number | null;
  location: string | null;
  status: ListingStatus;
  updated_at: string;
  view_count: number;
  categories: { name_en: string } | null;
  listing_images: { thumb_key: string | null; storage_key: string }[];
};

function Thumb({ row, size }: { row: ListingRow; size: string }) {
  const cover = row.listing_images[0];
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-lg bg-steel-100 ${size}`}>
      {cover ? (
        <Image src={mediaUrl(cover.thumb_key ?? cover.storage_key)} alt="" fill sizes="64px" className="object-cover" unoptimized />
      ) : (
        <span className="grid size-full place-items-center text-steel-300">
          <IconCamera className="size-5" />
        </span>
      )}
    </span>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Riyadh" });

/** Data table on desktop, stacked cards on phones. */
export function ListingsTable({ rows }: { rows: ListingRow[] }) {
  return (
    <>
      {/* Desktop */}
      <div className={`${cardFlushClass} hidden md:block`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-steel-50">
              <tr>
                <th className={thClass}>Listing</th>
                <th className={thClass}>Year</th>
                <th className={thClass}>Location</th>
                <th className={thClass}>Status</th>
                <th className={`${thClass} text-end`}>Views</th>
                <th className={thClass}>Updated</th>
                <th className={thClass}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={trClass}>
                  <td className={tdClass}>
                    <Link href={`/admin/listings/${r.id}`} className="group flex items-center gap-3">
                      <Thumb row={r} size="size-12" />
                      <span className="min-w-0">
                        <span className="block max-w-xs truncate font-semibold text-steel-900 group-hover:text-accent-600">{r.title_en}</span>
                        <span className="block text-xs text-steel-500">
                          {r.ref_code}
                          {r.categories ? ` · ${r.categories.name_en}` : ""}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className={`${tdClass} text-steel-600`}>{r.year ?? "—"}</td>
                  <td className={`${tdClass} text-steel-600`}>{r.location ?? "—"}</td>
                  <td className={tdClass}>
                    <AdminStatusBadge status={r.status} />
                  </td>
                  <td className={`${tdClass} text-end font-semibold text-steel-900`}>{r.view_count}</td>
                  <td className={`${tdClass} whitespace-nowrap text-steel-500`}>{fmtDate(r.updated_at)}</td>
                  <td className={`${tdClass} text-end`}>
                    <Link
                      href={`/admin/listings/${r.id}`}
                      className="inline-flex h-9 items-center rounded-lg border border-steel-200 px-3.5 text-xs font-bold text-steel-700 hover:border-accent-500 hover:text-accent-600"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile */}
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/admin/listings/${r.id}`}
              className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-[0_4px_20px_rgba(13,30,40,0.06)] active:bg-steel-50"
            >
              <Thumb row={r} size="size-16" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-steel-900">{r.title_en}</span>
                <span className="block truncate text-xs text-steel-500">
                  {[r.ref_code, r.categories?.name_en, r.year, r.location].filter(Boolean).join(" · ")}
                </span>
                <span className="mt-1.5 flex items-center gap-2">
                  <AdminStatusBadge status={r.status} />
                  <span className="text-xs text-steel-500">{r.view_count} views</span>
                </span>
              </span>
              <IconChevronEnd className="size-5 shrink-0 text-steel-300 rtl:-scale-x-100" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
