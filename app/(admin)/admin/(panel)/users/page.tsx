import type { Metadata } from "next";
import { CreateUserForm } from "@/components/admin/CreateUserForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { cardClass } from "@/components/admin/styles";
import { UsersTable, type AdminUserRow } from "@/components/admin/UsersTable";
import { requireOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Users" };

function isBanned(until: string | null | undefined): boolean {
  return !!until && new Date(until).getTime() > Date.now();
}

export default async function UsersPage() {
  const session = await requireOwner();

  const { data: profiles } = await session.supabase
    .from("profiles")
    .select("user_id, full_name, role, created_at")
    .order("created_at", { ascending: true });

  // Emails, last sign-in and ban state live in auth.users (service role, server only).
  let authUsers: { id: string; email?: string; last_sign_in_at?: string | null; banned_until?: string | null }[] = [];
  let authError = false;
  try {
    const { data, error } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    authUsers = data.users;
  } catch (e) {
    authError = true;
    console.error("users page: listUsers failed", e instanceof Error ? e.message : e);
  }
  const byId = new Map(authUsers.map((u) => [u.id, u]));

  const rows: AdminUserRow[] = (profiles ?? []).map((p) => {
    const u = byId.get(p.user_id);
    return {
      userId: p.user_id,
      fullName: p.full_name,
      email: u?.email ?? null,
      role: p.role,
      lastSignIn: u?.last_sign_in_at ?? null,
      disabled: isBanned(u?.banned_until),
      isSelf: p.user_id === session.userId,
    };
  });

  return (
    <div>
      <PageHeader title="Users" subtitle="Who can sign in to the admin, and what they can do." />

      {authError ? (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Couldn&apos;t load sign-in details. Check that <code>SUPABASE_SERVICE_ROLE_KEY</code> is set on the server.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <UsersTable users={rows} />
        </div>
        <div className="space-y-6">
          <CreateUserForm />
          <div className={`${cardClass} text-sm text-steel-600`}>
            <h2 className="mb-2 font-display text-base font-bold text-steel-900">Roles</h2>
            <p>
              <strong className="text-steel-900">Staff</strong> add listings from their phone and submit them for approval. They can only
              edit their own drafts.
            </p>
            <p className="mt-2">
              <strong className="text-steel-900">Owner</strong> approves and publishes listings, marks them sold, sees private costs and
              enquiries, and manages users.
            </p>
            <p className="mt-2">Disabling a user blocks sign-in but keeps their listings.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
