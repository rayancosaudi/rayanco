/** Admin navigation model, shared by the sidebar and the top bar title. */

export type AdminNavKey = "dashboard" | "listings" | "new" | "enquiries" | "users";

export type AdminNavItem = {
  key: AdminNavKey;
  href: string;
  label: string;
  ownerOnly?: boolean;
};

export const ADMIN_NAV_GROUPS: { title: string; items: AdminNavItem[] }[] = [
  {
    title: "Main",
    items: [
      { key: "dashboard", href: "/admin", label: "Dashboard" },
      { key: "listings", href: "/admin/listings", label: "Listings" },
      { key: "new", href: "/admin/listings/new", label: "New listing" },
    ],
  },
  {
    title: "Manage",
    items: [
      { key: "enquiries", href: "/admin/enquiries", label: "Enquiries", ownerOnly: true },
      { key: "users", href: "/admin/users", label: "Users", ownerOnly: true },
    ],
  },
];

/** Which nav item a pathname belongs to. */
export function activeNavKey(pathname: string): AdminNavKey | null {
  if (pathname === "/admin") return "dashboard";
  if (pathname === "/admin/listings/new") return "new";
  if (pathname.startsWith("/admin/listings")) return "listings";
  if (pathname.startsWith("/admin/enquiries")) return "enquiries";
  if (pathname.startsWith("/admin/users")) return "users";
  return null;
}

export function pageTitle(pathname: string): string {
  if (/^\/admin\/listings\/[0-9a-f-]{36}$/i.test(pathname)) return "Edit listing";
  const key = activeNavKey(pathname);
  for (const g of ADMIN_NAV_GROUPS) for (const i of g.items) if (i.key === key) return i.label;
  return "Admin";
}

/** Cookie that remembers the collapsed desktop sidebar. */
export const SIDEBAR_COOKIE = "rayanco_admin_sidebar";
