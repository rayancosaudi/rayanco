"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: string; exact?: boolean };

/** Bottom tab bar on phones, top links on desktop. */
export function AdminNav({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  const items: Item[] = [
    { href: "/admin", label: "Dashboard", icon: "▦", exact: true },
    { href: "/admin/listings/new", label: "New", icon: "＋", exact: true },
    { href: "/admin/listings", label: "Listings", icon: "☰" },
    ...(isOwner ? [{ href: "/admin/enquiries", label: "Enquiries", icon: "✉" }] : []),
  ];
  const active = (i: Item) =>
    i.exact ? pathname === i.href : pathname.startsWith(i.href) && pathname !== "/admin/listings/new";

  return (
    <nav
      aria-label="Admin"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-steel-100 bg-white pb-[env(safe-area-inset-bottom)] md:static md:border-0 md:bg-transparent md:pb-0"
    >
      <ul className="mx-auto flex max-w-3xl md:gap-1">
        {items.map((i) => (
          <li key={i.href} className="flex-1 md:flex-none">
            <Link
              href={i.href}
              aria-current={active(i) ? "page" : undefined}
              className={`flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold md:h-9 md:flex-row md:gap-2 md:rounded-full md:px-4 md:text-sm ${
                active(i) ? "text-accent-600 md:bg-white/15 md:text-white" : "text-steel-500 md:text-steel-200 md:hover:text-white"
              }`}
            >
              <span aria-hidden="true" className="text-lg leading-none md:text-sm">
                {i.icon}
              </span>
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
