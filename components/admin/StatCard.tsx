import Link from "next/link";

const TONES = {
  green: "bg-accent-500/10 text-accent-600",
  blue: "bg-sky-500/10 text-sky-600",
  amber: "bg-amber-400/15 text-amber-700",
  purple: "bg-violet-500/10 text-violet-600",
  red: "bg-red-500/10 text-red-600",
  steel: "bg-steel-900/[0.07] text-steel-700",
} as const;

export type StatTone = keyof typeof TONES;

/** PlainAdmin "icon-card": tinted icon tile + label + big number. */
export function StatCard({
  label,
  value,
  sub,
  icon,
  tone,
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tone: StatTone;
  href?: string;
}) {
  const body = (
    <>
      <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${TONES[tone]}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-steel-500">{label}</span>
        <span className="mt-0.5 block font-display text-2xl font-bold leading-tight text-steel-900">{value}</span>
        {sub ? <span className="mt-0.5 block truncate text-xs text-steel-500">{sub}</span> : null}
      </span>
    </>
  );
  const cls =
    "flex items-center gap-4 rounded-xl bg-white p-5 shadow-[0_4px_20px_rgba(13,30,40,0.06)] transition-shadow";
  return href ? (
    <Link href={href} className={`${cls} hover:shadow-[0_8px_28px_rgba(13,30,40,0.12)]`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
