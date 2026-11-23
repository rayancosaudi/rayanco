import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/models";

export type AdminSession = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string | null;
  profile: Pick<Profile, "user_id" | "full_name" | "role">;
  isOwner: boolean;
};

/**
 * The signed-in staff member, or null. Deduplicated per request.
 * RLS is still the real gate: this only decides what UI to show and fails fast.
 */
export const getSession = cache(async (): Promise<AdminSession | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, full_name, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return null;

  return { supabase, userId: user.id, email: user.email ?? null, profile, isOwner: profile.role === "owner" };
});

export async function requireUser(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function requireOwner(): Promise<AdminSession> {
  const session = await requireUser();
  if (!session.isOwner) redirect("/admin");
  return session;
}
