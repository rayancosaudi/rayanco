import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ListingForm } from "@/components/admin/ListingForm";
import { StatusActions } from "@/components/admin/StatusActions";
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
      .select("id, r2_key, thumb_key, width, height, bytes")
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/admin/listings" className="text-sm font-semibold text-steel-500">
          ← Listings
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold">{listing.title_en}</h1>
          <AdminStatusBadge status={listing.status} />
        </div>
        <p className="text-sm text-steel-500">
          Ref {listing.ref_code} · {listing.view_count} views
          {publicUrl ? (
            <>
              {" · "}
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-600 underline">
                View on site ↗
              </a>
            </>
          ) : null}
        </p>
        {listing.status === "pending" && !isOwner ? (
          <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-900">
            Waiting for the owner to approve. You can still make changes.
          </p>
        ) : null}
        <StatusActions listingId={listing.id} status={listing.status} isOwner={isOwner} isCreator={isCreator} />
      </div>

      <div className="rounded-2xl border border-steel-100 bg-white p-4">
        <ImageUploader listingId={listing.id} initialImages={images ?? []} editable={editable} />
      </div>

      <div className="rounded-2xl border border-steel-100 bg-white p-4">
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
  );
}
