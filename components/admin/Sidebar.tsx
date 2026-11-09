"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { site } from "@/lib/site";
import {
  IconClose,
  IconDashboard,
  IconGlobe,
  IconList,
  IconLogout,
  IconMail,
  IconPlus,
  IconUsers,
} from "./icons";
import { ADMIN_NAV_GROUPS, activeNavKey, type AdminNavKey } from "./nav";

const ICONS: Record<AdminNavKey, (p: { className?: string }) => React.ReactElement> = {
  dashboard: IconDashboard,
  listings: IconList,
  new: IconPlus,
  enquiries: IconMail,
  users: IconUsers,
};

/**
 * PlainAdmin-style sidebar. Fixed on desktop (wide or icon-only rail),
 * a slide-in drawer below `lg`.
 */
export function Sidebar({
  isOwner,
  pendingCount,
  collapsed,
  mobileOpen,
  onClose,
}: {
  isOwner: boolean;
  pendingCount: number;
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const active = activeNavKey(pathname);
  // The rail is only icon-only on desktop; the mobile drawer always shows labels.
  const hideLabel = collapsed ? "lg:sr-only" : "";

  return (
    <aside
      id="admin-sidebar"
      aria-label="Admin navigation"
      className={`fixed inset-y-0 start-0 z-40 flex w-[288px] max-w-[85vw] flex-col bg-white shadow-[0_0_30px_rgba(13,30,40,0.08)] transition-[transform,width] duration-200 lg:translate-x-0 ${
        collapsed ? "lg:w-20" : "lg:w-[260px]"
      } ${mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"}`}
    >
      <div className={`flex h-[72px] shrink-0 items-center justify-between gap-2 border-b border-steel-100 px-5 ${collapsed ? "lg:justify-center lg:px-0" : ""}`}>
        <Link href="/admin" onClick={onClose} className="flex min-w-0 items-center gap-2.5" aria-label="Rayanco admin dashboard">
          <Image src={site.logo.src} alt="" width={site.logo.width} height={site.logo.height} className="h-8 w-auto shrink-0" />
          <span className={`truncate font-display text-lg font-bold text-steel-900 ${hideLabel}`}>
            Rayanco <span className="text-accent-600">Admin</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="grid size-10 place-items-center rounded-lg text-steel-500 hover:bg-steel-50 lg:hidden"
        >
          <IconClose />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5">
        {ADMIN_NAV_GROUPS.map((group) => {
          const items = group.items.filter((i) => isOwner || !i.ownerOnly);
          if (!items.length) return null;
          return (
            <div key={group.title} className="mb-6">
              <p className="mb-2 px-3 font-ui text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-steel-400">
                <span className={collapsed ? "lg:sr-only" : ""}>{group.title}</span>
                {collapsed ? <span aria-hidden="true" className="hidden lg:mx-auto lg:my-2 lg:block lg:h-px lg:w-6 lg:bg-steel-200" /> : null}
              </p>
              <ul className="space-y-1">
                {items.map((item) => {
                  const Icon = ICONS[item.key];
                  const isActive = active === item.key;
                  const badge = item.key === "listings" && pendingCount > 0 ? pendingCount : null;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={isActive ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                        className={`relative flex h-11 items-center gap-3 rounded-lg px-3 text-[0.94rem] font-semibold transition-colors ${
                          collapsed ? "lg:justify-center lg:px-0" : ""
                        } ${
                          isActive
                            ? "bg-accent-50 text-accent-700 before:absolute before:inset-y-2 before:start-0 before:w-[3px] before:rounded-full before:bg-accent-500"
                            : "text-steel-600 hover:bg-steel-50 hover:text-steel-900"
                        }`}
                      >
                        <Icon className="size-5 shrink-0" />
                        <span className={`flex-1 truncate ${hideLabel}`}>{item.label}</span>
                        {badge ? (
                          <span
                            className={`grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 text-[0.7rem] font-bold text-steel-950 ${
                              collapsed ? "lg:absolute lg:end-2 lg:top-1.5 lg:h-4 lg:min-w-4 lg:px-1 lg:text-[0.6rem]" : ""
                            }`}
                            title={`${badge} waiting for approval`}
                          >
                            {badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-steel-100 px-3 py-4">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          title={collapsed ? "View website" : undefined}
          className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-steel-600 hover:bg-steel-50 hover:text-steel-900 ${
            collapsed ? "lg:justify-center lg:px-0" : ""
          }`}
        >
          <IconGlobe className="size-5 shrink-0" />
          <span className={hideLabel}>View website</span>
        </a>
        <form action={signOut}>
          <button
            type="submit"
            title={collapsed ? "Sign out" : undefined}
            className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50 ${
              collapsed ? "lg:justify-center lg:px-0" : ""
            }`}
          >
            <IconLogout className="size-5 shrink-0" />
            <span className={hideLabel}>Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
