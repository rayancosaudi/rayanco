"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconMenu } from "./icons";
import { pageTitle, SIDEBAR_COOKIE } from "./nav";
import { ProfileMenu } from "./ProfileMenu";
import { Sidebar } from "./Sidebar";

/** PlainAdmin-style frame: sidebar + sticky top bar + content. */
export function AdminShell({
  user,
  pendingCount,
  initialCollapsed,
  children,
}: {
  user: { fullName: string; email: string | null; isOwner: boolean };
  pendingCount: number;
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Drawer: Esc closes it, and the page behind doesn't scroll.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  function toggleMenu() {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      const next = !collapsed;
      setCollapsed(next);
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/admin; max-age=31536000; samesite=lax`;
    } else {
      setMobileOpen((o) => !o);
    }
  }

  return (
    <div className="min-h-dvh bg-steel-50">
      <Sidebar
        isOwner={user.isOwner}
        pendingCount={pendingCount}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {mobileOpen ? (
        <div aria-hidden="true" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-steel-950/50 backdrop-blur-[2px] lg:hidden" />
      ) : null}

      <div className={`transition-[padding] duration-200 ${collapsed ? "lg:ps-20" : "lg:ps-[260px]"}`}>
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-3 bg-white px-4 shadow-[0_2px_12px_rgba(13,30,40,0.05)] md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={toggleMenu}
              aria-label="Toggle menu"
              aria-controls="admin-sidebar"
              aria-expanded={mobileOpen}
              className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent-500 text-white hover:bg-accent-600"
            >
              <IconMenu />
            </button>
            <p className="truncate font-display text-lg font-bold text-steel-900 md:text-xl">{pageTitle(pathname)}</p>
          </div>
          <ProfileMenu fullName={user.fullName} email={user.email} isOwner={user.isOwner} />
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
