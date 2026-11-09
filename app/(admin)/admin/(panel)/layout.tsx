import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/actions/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireUser } from "@/lib/auth";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Panel>{children}</Panel>
    </Suspense>
  );
}

async function Panel({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <header className="bg-steel-950 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="font-display text-lg font-bold">
            Rayanco <span className="text-accent-400">Admin</span>
          </Link>
          <div className="hidden md:block">
            <AdminNav isOwner={session.isOwner} />
          </div>
          <form action={signOut} className="flex items-center gap-3 text-xs text-steel-300">
            <span className="hidden max-w-40 truncate sm:inline">
              {session.profile.full_name} · {session.isOwner ? "Owner" : "Staff"}
            </span>
            <button type="submit" className="rounded-full border border-white/25 px-3 py-1.5 font-semibold text-white hover:bg-white/10">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="md:hidden">
        <AdminNav isOwner={session.isOwner} />
      </div>
      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="min-h-dvh">
      <div className="h-14 bg-steel-950" />
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-5">
        <div className="h-8 w-40 animate-pulse rounded bg-steel-200" />
        <div className="h-32 animate-pulse rounded-2xl bg-steel-100" />
      </div>
    </div>
  );
}
