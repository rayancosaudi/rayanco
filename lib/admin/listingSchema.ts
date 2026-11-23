import { z } from "zod";
import { LISTING_CONDITIONS, type ListingStatus } from "@/lib/supabase/models";

/**
 * Shared by the admin listing form (client) and the save action (server).
 * Form values are strings (HTML inputs); this schema turns them into DB values.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

const optionalInt = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v.replace(/,/g, ""));
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message: `Enter a whole number from ${min} to ${max}` });
        return z.NEVER;
      }
      return n;
    });

const optionalPrice = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const n = Number(v.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) {
      ctx.addIssue({ code: "custom", message: "Enter a price in SAR" });
      return z.NEVER;
    }
    return n;
  });

const maxYear = new Date().getFullYear() + 1;

export const listingFormSchema = z.object({
  category_id: z.uuid({ message: "Choose a category" }),
  title_en: z.string().trim().min(3, "Title is required").max(140),
  title_ar: optionalText(140),
  make: optionalText(80),
  model: optionalText(80),
  year: optionalInt(1950, maxYear),
  condition: z
    .enum(["", ...LISTING_CONDITIONS])
    .transform((v) => (v === "" ? null : v)),
  hours_or_km: optionalInt(0, 10_000_000),
  capacity: optionalText(80),
  location: optionalText(80),
  quantity: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = v === "" ? 1 : Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 10_000) {
        ctx.addIssue({ code: "custom", message: "Quantity must be 1 or more" });
        return z.NEVER;
      }
      return n;
    }),
  price_sar: optionalPrice,
  price_on_request: z.boolean(),
  negotiable: z.boolean(),
  description_en: optionalText(5000),
  description_ar: optionalText(5000),
});

/** Owner-only fields, stored in `listing_private`. */
export const listingPrivateSchema = z.object({
  seller_source: optionalText(200),
  cost_sar: optionalPrice,
  internal_notes: optionalText(5000),
});

export type ListingFormValues = z.input<typeof listingFormSchema>;
export type ListingPrivateValues = z.input<typeof listingPrivateSchema>;

/** Minimal fields for "New listing" before the full form opens. */
export const newListingSchema = z.object({
  category_id: z.uuid({ message: "Choose a category" }),
  title_en: z.string().trim().min(3, "Title is required").max(140),
});

export const LOCATION_SUGGESTIONS = ["Jubail", "Dammam", "Al Khobar", "Riyadh", "Jeddah", "Yanbu"];

export const CONDITION_LABELS: Record<(typeof LISTING_CONDITIONS)[number], string> = {
  working: "Working",
  needs_repair: "Needs repair",
  for_scrap: "For scrap",
};

export const STATUS_LABELS: Record<ListingStatus, string> = {
  draft: "Draft",
  pending: "Pending review",
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
  archived: "Archived",
};

/** Statuses a staff member can still edit (mirrors RLS). */
export const STAFF_EDITABLE: readonly ListingStatus[] = ["draft", "pending"];
