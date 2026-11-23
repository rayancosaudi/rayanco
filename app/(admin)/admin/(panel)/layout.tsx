import { cookies } from "next/headers";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { SIDEBAR_COOKIE } from "@/components/admin/nav";
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
  const [cookieStore, pending] = await Promise.all([
    cookies(),
    session.isOwner
      ? session.supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending")
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <AdminShell
      user={{ fullName: session.profile.full_name, email: session.email, isOwner: session.isOwner }}
      pendingCount={pending.count ?? 0}
      initialCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"}
    >
      {children}
    </AdminShell>
  );
}

function PanelSkeleton() {
  return (
    <div className="min-h-dvh bg-steel-50">
      <div className="fixed inset-y-0 start-0 hidden w-[260px] bg-white lg:block" />
      <div className="lg:ps-[260px]">
        <div className="h-[72px] bg-white" />
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 md:px-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-white" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl bg-white" />
        </div>
      </div>
    </div>
  );
}
