"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { saveListing, type SaveResult } from "@/app/actions/admin-listings";
import {
  CONDITION_LABELS,
  LOCATION_SUGGESTIONS,
  type ListingFormValues,
  type ListingPrivateValues,
} from "@/lib/admin/listingSchema";
import { LISTING_CONDITIONS } from "@/lib/supabase/models";
import { btnDark, cardClass, inputClass, labelClass } from "./styles";

type FormValues = ListingFormValues & { private: ListingPrivateValues };

const AUTOSAVE_MS = 1500;


export function ListingForm({
  listingId,
  categories,
  initialValues,
  initialPrivate,
  editable,
  isOwner,
}: {
  listingId: string;
  categories: { id: string; name_en: string }[];
  initialValues: ListingFormValues;
  initialPrivate: ListingPrivateValues;
  editable: boolean;
  isOwner: boolean;
}) {
  const form = useForm<FormValues>({ defaultValues: { ...initialValues, private: initialPrivate } });
  const { register, getValues } = form;
  const [state, setState] = useState<{ kind: "idle" | "saving" | "saved" | "error"; text?: string }>({ kind: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestRun = useRef(0);

  function save() {
    if (!editable) return;
    clearTimeout(timer.current);
    const run = ++latestRun.current;
    const { private: priv, ...values } = getValues();
    setState({ kind: "saving" });
    startTransition(async () => {
      let res: SaveResult;
      try {
        res = await saveListing(listingId, values, isOwner ? priv : undefined);
      } catch {
        res = { ok: false, error: "No connection. Your changes will be saved when you're back online." };
      }
      if (run !== latestRun.current) return; // a newer save is in flight
      if (res.ok) {
        setErrors({});
        setState({ kind: "saved", text: new Date(res.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
      } else {
        setErrors(res.fieldErrors ?? {});
        setState({ kind: "error", text: res.error });
      }
    });
  }

  // Auto-save: debounce every change.
  useEffect(() => {
    if (!editable) return;
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(save, AUTOSAVE_MS);
      },
    });
    return () => {
      unsubscribe();
      clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable]);

  // Save before leaving the page / app switching on the phone.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden" && timer.current) save();
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priceOnRequest = useWatch({ control: form.control, name: "price_on_request" });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      noValidate
      className="space-y-6"
    >
      <fieldset disabled={!editable} className={cardClass}>
        <legend className="float-left mb-5 w-full font-display text-lg font-bold text-steel-900">Details</legend>
        <div className="clear-both space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Category *" error={errors.category_id}>
          <select className={inputClass} {...register("category_id")}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_en}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Title (English) *" error={errors.title_en} hint='e.g. "Liebherr LTM 1100 Mobile Crane"'>
          <input className={inputClass} {...register("title_en")} />
        </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Make" error={errors.make}>
            <input className={inputClass} {...register("make")} />
          </Field>
          <Field label="Model" error={errors.model}>
            <input className={inputClass} {...register("model")} />
          </Field>
          <Field label="Year" error={errors.year}>
            <NumberInput reg={register("year")} />
          </Field>
          <Field label="Condition" error={errors.condition}>
            <select className={inputClass} {...register("condition")}>
              <option value="">—</option>
              {LISTING_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {CONDITION_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Hours / km" error={errors.hours_or_km}>
            <NumberInput reg={register("hours_or_km")} />
          </Field>
          <Field label="Capacity" error={errors.capacity} hint='"50 ton", "500 kVA"'>
            <input className={inputClass} {...register("capacity")} />
          </Field>
          <Field label="Location" error={errors.location}>
            <input className={inputClass} list="location-suggestions" {...register("location")} />
            <datalist id="location-suggestions">
              {LOCATION_SUGGESTIONS.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </Field>
          <Field label="Quantity" error={errors.quantity}>
            <NumberInput reg={register("quantity")} />
          </Field>
        </div>
        </div>
      </fieldset>

      <fieldset disabled={!editable} className={cardClass}>
        <legend className="float-left mb-5 w-full font-display text-lg font-bold text-steel-900">Price</legend>
        <div className="clear-both grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2 md:items-start">
          <Field label="Price (SAR)" error={errors.price_sar}>
            <NumberInput reg={register("price_sar")} disabled={priceOnRequest} />
          </Field>
          <div className="md:pt-6">
            <Checkbox reg={register("price_on_request")} label="Price on request (hide the price)" />
            <Checkbox reg={register("negotiable")} label="Negotiable" />
          </div>
        </div>
      </fieldset>

      <fieldset disabled={!editable} className={cardClass}>
        <legend className="float-left mb-5 w-full font-display text-lg font-bold text-steel-900">Description</legend>
        <div className="clear-both space-y-4">
        <Field label="Description (English)" error={errors.description_en}>
          <textarea rows={5} className={inputClass} {...register("description_en")} />
        </Field>
        <details className="rounded-lg border border-steel-200 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-steel-700">Arabic (optional)</summary>
          <div className="mt-3 space-y-4">
            <Field label="Title (Arabic)" error={errors.title_ar}>
              <input dir="rtl" lang="ar" className={inputClass} {...register("title_ar")} />
            </Field>
            <Field label="Description (Arabic)" error={errors.description_ar}>
              <textarea dir="rtl" lang="ar" rows={5} className={inputClass} {...register("description_ar")} />
            </Field>
          </div>
        </details>
        </div>
      </fieldset>

      {isOwner ? (
        <fieldset disabled={!editable} className={`${cardClass} border-s-4 border-amber-400`}>
          <legend className="float-left mb-5 w-full font-display text-lg font-bold text-steel-900">
            Private <span className="ms-1 rounded-full bg-amber-100 px-2 py-0.5 align-middle text-xs font-semibold text-amber-800">Owner only</span>
            <span className="mt-1 block text-xs font-normal text-steel-500">Never shown on the website.</span>
          </legend>
          <div className="clear-both space-y-4">
          <Field label="Seller / source" error={errors.seller_source}>
            <input className={inputClass} {...register("private.seller_source")} />
          </Field>
          <Field label="Cost (SAR)" error={errors.cost_sar}>
            <NumberInput reg={register("private.cost_sar")} />
          </Field>
          <Field label="Internal notes" error={errors.internal_notes}>
            <textarea rows={3} className={inputClass} {...register("private.internal_notes")} />
          </Field>
          </div>
        </fieldset>
      ) : null}

      {editable ? (
        <div className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-3 rounded-xl bg-white/95 p-3 ps-5 shadow-[0_10px_40px_rgba(13,30,40,0.16)] ring-1 ring-steel-100 backdrop-blur">
          <SaveStatus state={state} />
          <button
            type="submit"
            className={`${btnDark} shrink-0`}
            disabled={state.kind === "saving"}
          >
            Save now
          </button>
        </div>
      ) : (
        <p className="rounded-xl bg-white px-5 py-4 text-sm text-steel-600 shadow-[0_4px_20px_rgba(13,30,40,0.06)]">
          This listing is read-only for you. Ask the owner to make changes.
        </p>
      )}
    </form>
  );
}

function SaveStatus({ state }: { state: { kind: string; text?: string } }) {
  const text =
    state.kind === "saving"
      ? "Saving…"
      : state.kind === "saved"
        ? `Saved ✓ ${state.text ?? ""}`
        : state.kind === "error"
          ? state.text
          : "Changes save automatically";
  return (
    <p
      role="status"
      className={`min-w-0 text-sm ${state.kind === "error" ? "font-semibold text-red-700" : "text-steel-600"}`}
    >
      {text}
    </p>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className={labelClass}>
      {label}
      {children}
      {error ? (
        <span className="mt-1 block text-sm font-normal text-red-700">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs font-normal text-steel-500">{hint}</span>
      ) : null}
    </label>
  );
}

function NumberInput({ reg, disabled }: { reg: UseFormRegisterReturn; disabled?: boolean }) {
  return <input className={inputClass} inputMode="numeric" dir="ltr" autoComplete="off" disabled={disabled} {...reg} />;
}

function Checkbox({ reg, label }: { reg: UseFormRegisterReturn; label: string }) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-steel-700">
      <input type="checkbox" className="size-5 accent-accent-500" {...reg} />
      {label}
    </label>
  );
}
