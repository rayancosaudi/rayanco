import type { Metadata } from "next";
import { NewListingForm } from "@/components/admin/NewListingForm";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "New listing" };

export default async function NewListingPage() {
  const { supabase } = await requireUser();
  const { data: categories } = await supabase.from("categories").select("id, name_en").order("sort").order("name_en");

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">New listing</h1>
      <p className="text-sm text-steel-600">
        Pick the category and a short title. You can then add photos and details. Everything saves as you go.
      </p>
      <NewListingForm categories={categories ?? []} />
    </div>
  );
}
