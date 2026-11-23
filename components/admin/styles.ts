/** Shared admin class strings (PlainAdmin layout, Rayanco brand). */

export const inputClass =
  "mt-1.5 block w-full rounded-lg border border-steel-200 bg-white px-3.5 py-2.5 text-base text-steel-900 placeholder:text-steel-400 transition-colors focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/10 disabled:bg-steel-50 disabled:text-steel-500 md:text-sm";

export const labelClass = "block text-sm font-semibold text-steel-700";

export const cardClass = "rounded-xl bg-white p-5 shadow-[0_4px_20px_rgba(13,30,40,0.06)] md:p-6";

/** Card without padding, for tables that run edge to edge. */
export const cardFlushClass = "overflow-hidden rounded-xl bg-white shadow-[0_4px_20px_rgba(13,30,40,0.06)]";

export const cardTitleClass = "font-display text-lg font-bold text-steel-900";

const btnBase =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition-colors disabled:pointer-events-none disabled:opacity-50";

export const btnPrimary = `${btnBase} bg-accent-500 text-white hover:bg-accent-600`;
export const btnDark = `${btnBase} bg-steel-900 text-white hover:bg-steel-800`;
export const btnOutline = `${btnBase} border border-steel-200 bg-white text-steel-900 hover:bg-steel-50`;
export const btnDanger = `${btnBase} border border-red-200 bg-white text-red-700 hover:bg-red-50`;

/** Table pieces (desktop). */
export const thClass = "px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-steel-500 first:ps-6 last:pe-6";
export const tdClass = "px-4 py-3.5 align-middle first:ps-6 last:pe-6";
export const trClass = "border-t border-steel-100 transition-colors hover:bg-steel-50/70";

/** Pill filter tab. */
export function pillClass(active: boolean) {
  return `inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors ${
    active ? "bg-steel-900 text-white" : "bg-steel-50 text-steel-600 hover:bg-steel-100 hover:text-steel-900"
  }`;
}
