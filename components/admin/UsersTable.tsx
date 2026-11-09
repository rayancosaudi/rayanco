"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resetUserPassword, setUserActive, setUserRole, type UserActionResult } from "@/app/actions/admin-users";
import { cardFlushClass, cardTitleClass, tdClass, thClass, trClass } from "./styles";

export type AdminUserRow = {
  userId: string;
  fullName: string;
  email: string | null;
  role: "owner" | "staff";
  lastSignIn: string | null;
  disabled: boolean;
  isSelf: boolean;
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Riyadh" }) : "Never";

export function UsersTable({ users }: { users: AdminUserRow[] }) {
  return (
    <section className={cardFlushClass}>
      <div className="px-6 pb-3 pt-5">
        <h2 className={cardTitleClass}>Team</h2>
        <p className="text-sm text-steel-500">
          {users.length} {users.length === 1 ? "person" : "people"} can sign in to the admin.
        </p>
      </div>

      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-steel-50">
            <tr>
              <th className={thClass}>Name</th>
              <th className={thClass}>Role</th>
              <th className={thClass}>Last sign-in</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow key={u.userId} user={u} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="md:hidden">
        {users.map((u) => (
          <li key={u.userId} className="border-t border-steel-100 px-5 py-4">
            <UserCard user={u} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function useUserActions(userId: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const run = (fn: () => Promise<UserActionResult>, ok?: string) => {
    setError(null);
    setNotice(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else {
        if (ok) setNotice(ok);
        router.refresh();
      }
    });
  };
  return {
    pending,
    error,
    notice,
    setRole: (role: "owner" | "staff") => run(() => setUserRole(userId, role)),
    setActive: (active: boolean) => run(() => setUserActive(userId, active)),
    resetPassword: (pw: string) => run(() => resetUserPassword(userId, pw), "Password updated."),
  };
}

function Avatar({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const ini = ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  return <span className="grid size-10 shrink-0 place-items-center rounded-full bg-steel-900 font-display text-sm font-bold text-white">{ini || "?"}</span>;
}

function StatusPill({ disabled }: { disabled: boolean }) {
  return disabled ? (
    <span className="inline-flex rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold leading-none text-red-700">Disabled</span>
  ) : (
    <span className="inline-flex rounded-full bg-accent-500/10 px-2.5 py-1 text-xs font-semibold leading-none text-accent-700">Active</span>
  );
}

function RoleSelect({ user, actions }: { user: AdminUserRow; actions: ReturnType<typeof useUserActions> }) {
  if (user.isSelf) {
    return <span className="text-sm font-semibold capitalize text-steel-900">{user.role} (you)</span>;
  }
  return (
    <select
      aria-label={`Role for ${user.fullName}`}
      value={user.role}
      disabled={actions.pending}
      onChange={(e) => actions.setRole(e.currentTarget.value as "owner" | "staff")}
      className="h-9 rounded-lg border border-steel-200 bg-white px-2.5 text-sm font-semibold text-steel-900 focus:border-accent-500 focus:outline-none"
    >
      <option value="staff">Staff</option>
      <option value="owner">Owner</option>
    </select>
  );
}

function RowActions({ user, actions }: { user: AdminUserRow; actions: ReturnType<typeof useUserActions> }) {
  const [resetting, setResetting] = useState(false);
  const [pw, setPw] = useState("");
  if (user.isSelf) return null;

  if (resetting) {
    return (
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          actions.resetPassword(pw);
          setResetting(false);
          setPw("");
        }}
      >
        <input
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.currentTarget.value)}
          minLength={8}
          required
          placeholder="New password"
          aria-label={`New password for ${user.fullName}`}
          dir="ltr"
          className="h-9 w-40 rounded-lg border border-steel-200 px-2.5 text-sm focus:border-accent-500 focus:outline-none"
        />
        <button type="submit" className="h-9 rounded-lg bg-accent-500 px-3 text-xs font-bold text-white hover:bg-accent-600">
          Save
        </button>
        <button type="button" onClick={() => setResetting(false)} className="h-9 px-2 text-xs font-semibold text-steel-500">
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={actions.pending}
        onClick={() => setResetting(true)}
        className="h-9 rounded-lg border border-steel-200 px-3 text-xs font-bold text-steel-700 hover:bg-steel-50 disabled:opacity-50"
      >
        Reset password
      </button>
      <button
        type="button"
        disabled={actions.pending}
        onClick={() => actions.setActive(user.disabled)}
        className={`h-9 rounded-lg border px-3 text-xs font-bold disabled:opacity-50 ${
          user.disabled ? "border-accent-200 text-accent-700 hover:bg-accent-50" : "border-red-200 text-red-700 hover:bg-red-50"
        }`}
      >
        {user.disabled ? "Enable" : "Disable"}
      </button>
    </div>
  );
}

function Feedback({ actions }: { actions: ReturnType<typeof useUserActions> }) {
  if (actions.error) return <p role="alert" className="mt-1 text-xs font-semibold text-red-700">{actions.error}</p>;
  if (actions.notice) return <p role="status" className="mt-1 text-xs font-semibold text-accent-700">{actions.notice}</p>;
  return null;
}

function UserRow({ user }: { user: AdminUserRow }) {
  const actions = useUserActions(user.userId);
  return (
    <tr className={`${trClass} ${user.disabled ? "opacity-60" : ""}`}>
      <td className={tdClass}>
        <span className="flex items-center gap-3">
          <Avatar name={user.fullName} />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-steel-900">{user.fullName}</span>
            <span className="block truncate text-xs text-steel-500" dir="ltr">
              {user.email ?? "—"}
            </span>
          </span>
        </span>
      </td>
      <td className={tdClass}>
        <RoleSelect user={user} actions={actions} />
      </td>
      <td className={`${tdClass} whitespace-nowrap text-steel-500`}>{fmt(user.lastSignIn)}</td>
      <td className={tdClass}>
        <StatusPill disabled={user.disabled} />
      </td>
      <td className={tdClass}>
        <RowActions user={user} actions={actions} />
        <Feedback actions={actions} />
      </td>
    </tr>
  );
}

function UserCard({ user }: { user: AdminUserRow }) {
  const actions = useUserActions(user.userId);
  return (
    <div className={user.disabled ? "opacity-60" : ""}>
      <div className="flex items-center gap-3">
        <Avatar name={user.fullName} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-steel-900">{user.fullName}</span>
          <span className="block truncate text-xs text-steel-500" dir="ltr">
            {user.email ?? "—"}
          </span>
        </span>
        <StatusPill disabled={user.disabled} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <RoleSelect user={user} actions={actions} />
        <span className="text-xs text-steel-500">Last sign-in: {fmt(user.lastSignIn)}</span>
      </div>
      <div className="mt-3">
        <RowActions user={user} actions={actions} />
        <Feedback actions={actions} />
      </div>
    </div>
  );
}
