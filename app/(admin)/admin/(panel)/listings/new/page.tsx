import type { Metadata } from "next";
import { NewListingForm } from "@/components/admin/NewListingForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "New listing" };

const STEPS = [
  { title: "Category & title", text: "Pick what it is and give it a short name." },
  { title: "Photos", text: "Take photos on site. They're compressed automatically." },
  { title: "Details & price", text: "Make, model, year, condition. Everything auto-saves." },
  { title: "Submit", text: "Send it for approval. The owner publishes it." },
];

export default async function NewListingPage() {
  const { supabase } = await requireUser();
  const { data: categories } = await supabase.from("categories").select("id, name_en").order("sort").order("name_en");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        crumbs={[{ href: "/admin/listings", label: "Listings" }]}
        title="New listing"
        subtitle="Start with the category and a short title. You'll add photos and details next."
      />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
        <div className="md:col-span-3">
          <NewListingForm categories={categories ?? []} />
        </div>
        <ol className="space-y-4 md:col-span-2 md:pt-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  i === 0 ? "bg-accent-500 text-white" : "bg-white text-steel-500 shadow-[0_2px_8px_rgba(13,30,40,0.08)]"
                }`}
              >
                {i + 1}
              </span>
              <span>
                <span className="block text-sm font-bold text-steel-900">{s.title}</span>
                <span className="block text-sm text-steel-500">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
