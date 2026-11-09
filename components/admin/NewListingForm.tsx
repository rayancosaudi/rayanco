"use client";

import { useActionState } from "react";
import { createDraft, type CreateDraftState } from "@/app/actions/admin-listings";
import { btnPrimary, cardClass, inputClass, labelClass } from "./styles";

export function NewListingForm({ categories }: { categories: { id: string; name_en: string }[] }) {
  const [state, action, pending] = useActionState<CreateDraftState, FormData>(createDraft, undefined);
  return (
    <form action={action} className={`${cardClass} space-y-5`}>
      <label className={labelClass}>
        Category *
        <select name="category_id" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Choose…
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_en}
            </option>
          ))}
        </select>
        {state?.fieldErrors?.category_id ? (
          <span className="mt-1 block font-normal text-red-700">{state.fieldErrors.category_id}</span>
        ) : null}
      </label>
      <label className={labelClass}>
        Title *
        <input name="title_en" required minLength={3} maxLength={140} placeholder="e.g. Caterpillar 950H Wheel Loader" className={inputClass} />
        {state?.fieldErrors?.title_en ? (
          <span className="mt-1 block font-normal text-red-700">{state.fieldErrors.title_en}</span>
        ) : null}
      </label>
      {state?.error ? (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={`${btnPrimary} h-12 w-full text-base`}
      >
        {pending ? "Creating…" : "Continue → add photos"}
      </button>
    </form>
  );
}
