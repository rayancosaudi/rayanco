"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/actions/auth";
import { IconChevronDown, IconGlobe, IconLogout } from "./icons";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "R";
}

export function ProfileMenu({ fullName, email, isOwner }: { fullName: string; email: string | null; isOwner: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const role = isOwner ? "Owner" : "Staff";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-3 rounded-full py-1 ps-1 pe-2 hover:bg-steel-50 sm:pe-3"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-steel-900 font-display text-sm font-bold text-white">
          {initials(fullName)}
        </span>
        <span className="hidden min-w-0 text-start sm:block">
          <span className="block max-w-40 truncate text-sm font-bold text-steel-900">{fullName}</span>
          <span className="block text-xs text-steel-500">{role}</span>
        </span>
        <IconChevronDown className={`hidden size-4 text-steel-400 transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl bg-white shadow-[0_10px_40px_rgba(13,30,40,0.16)] ring-1 ring-steel-100"
        >
          <div className="border-b border-steel-100 px-4 py-3">
            <p className="truncate text-sm font-bold text-steel-900">{fullName}</p>
            {email ? <p className="truncate text-xs text-steel-500">{email}</p> : null}
            <span className="mt-2 inline-flex rounded-full bg-accent-50 px-2 py-0.5 text-[0.7rem] font-bold text-accent-700">{role}</span>
          </div>
          <a
            role="menuitem"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-steel-700 hover:bg-steel-50"
          >
            <IconGlobe className="size-4" /> View website
          </a>
          <form action={signOut}>
            <button
              role="menuitem"
              type="submit"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              <IconLogout className="size-4" /> Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
