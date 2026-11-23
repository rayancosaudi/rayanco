import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { IconExternal } from "@/components/admin/icons";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ListingForm } from "@/components/admin/ListingForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusActions } from "@/components/admin/StatusActions";
import { btnOutline, cardClass, cardTitleClass } from "@/components/admin/styles";
import { UUID_RE, isPublicStatus } from "@/lib/admin/access";
import { STAFF_EDITABLE, type ListingFormValues, type ListingPrivateValues } from "@/lib/admin/listingSchema";
import { requireUser } from "@/lib/auth";
import { listingPath } from "@/lib/listings/format";

export const metadata: Metadata = { title: "Edit listing" };

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const session = await requireUser();
  const { supabase, isOwner, userId } = session;

  const [{ data: listing }, { data: categories }, { data: images }, privateRes] = await Promise.all([
    supabase
      .from("listings")
      .select(
        "id, ref_code, slug, category_id, title_en, title_ar, make, model, year, condition, hours_or_km, capacity, location, quantity, price_sar, price_on_request, negotiable, description_en, description_ar, status, created_by, view_count, published_at, sold_at, categories(slug)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("id, name_en").order("sort").order("name_en"),
    supabase
      .from("listing_images")
      .select("id, storage_key, thumb_key, width, height, bytes")
      .eq("listing_id", id)
      .order("sort_order"),
    isOwner
      ? supabase.from("listing_private").select("seller_source, cost_sar, internal_notes").eq("listing_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // RLS hides other staff members' drafts; owners see everything.
  if (!listing || (!isOwner && listing.created_by !== userId)) notFound();

  const isCreator = listing.created_by === userId;
  const editable = isOwner || (isCreator && STAFF_EDITABLE.includes(listing.status));

  const values: ListingFormValues = {
    category_id: listing.category_id,
    title_en: listing.title_en,
    title_ar: str(listing.title_ar),
    make: str(listing.make),
    model: str(listing.model),
    year: str(listing.year),
    condition: (listing.condition ?? "") as ListingFormValues["condition"],
    hours_or_km: str(listing.hours_or_km),
    capacity: str(listing.capacity),
    location: str(listing.location),
    quantity: str(listing.quantity),
    price_sar: str(listing.price_sar),
    price_on_request: listing.price_on_request,
    negotiable: listing.negotiable,
    description_en: str(listing.description_en),
    description_ar: str(listing.description_ar),
  };
  const priv: ListingPrivateValues = {
    seller_source: str(privateRes.data?.seller_source),
    cost_sar: str(privateRes.data?.cost_sar),
    internal_notes: str(privateRes.data?.internal_notes),
  };

  const publicUrl = listing.categories && isPublicStatus(listing.status) ? listingPath(listing.categories.slug, listing.slug) : null;

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Riyadh" }) : "—";

  return (
    <div>
      <PageHeader
        crumbs={[{ href: "/admin/listings", label: "Listings" }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 break-words">{listing.title_en}</span>
            <AdminStatusBadge status={listing.status} />
          </span>
        }
        subtitle={`Ref ${listing.ref_code}`}
        actions={
          publicUrl ? (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className={btnOutline}>
              <IconExternal className="size-4" /> View on site
            </a>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <aside className="lg:order-2">
          <div className={`${cardClass} space-y-5 lg:sticky lg:top-24`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={cardTitleClass}>Status &amp; actions</h2>
              <AdminStatusBadge status={listing.status} />
            </div>
            {listing.status === "pending" && !isOwner ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Waiting for the owner to approve. You can still make changes.
              </p>
            ) : null}
            <StatusActions listingId={listing.id} status={listing.status} isOwner={isOwner} isCreator={isCreator} />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-steel-100 pt-4 text-sm">
              <div>
                <dt className="text-xs text-steel-500">Reference</dt>
                <dd className="font-semibold text-steel-900">{listing.ref_code}</dd>
              </div>
              <div>
                <dt className="text-xs text-steel-500">Views</dt>
                <dd className="font-semibold text-steel-900">{listing.view_count}</dd>
              </div>
              <div>
                <dt className="text-xs text-steel-500">Published</dt>
                <dd className="font-semibold text-steel-900">{fmt(listing.published_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-steel-500">Sold</dt>
                <dd className="font-semibold text-steel-900">{fmt(listing.sold_at)}</dd>
              </div>
            </dl>
          </div>
        </aside>

        <div className="space-y-6 lg:order-1 lg:col-span-2">
          <div className={cardClass}>
            <ImageUploader listingId={listing.id} initialImages={images ?? []} editable={editable} />
          </div>
          <ListingForm
            listingId={listing.id}
            categories={categories ?? []}
            initialValues={values}
            initialPrivate={priv}
            editable={editable}
            isOwner={isOwner}
          />
        </div>
      </div>
    </div>
  );
}
