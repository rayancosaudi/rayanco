import type { Metadata, Viewport } from "next";
import { figtree, outfit, poppins } from "../fonts";
import "../globals.css";

/** Root layout for /admin: no public header/footer, never indexed (CLAUDE.md §3.7). */
export const metadata: Metadata = {
  title: { template: "%s | Rayanco Admin", default: "Rayanco Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: "#0d1e28",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${figtree.variable} ${outfit.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full bg-steel-50 font-sans text-steel-900">{children}</body>
    </html>
  );
}
