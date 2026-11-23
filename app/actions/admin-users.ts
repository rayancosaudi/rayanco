"use server";

import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { UUID_RE } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Owner-only user management. Every action re-checks the owner role first;
 * the service-role client is used only for auth.users operations.
 */

export type UserActionResult = { ok: true } | { ok: false; error: string };
export type CreateUserState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | undefined;

const roleSchema = z.enum(["owner", "staff"]);
const passwordSchema = z.string().min(8, "At least 8 characters.").max(72, "At most 72 characters.");

const createSchema = z.object({
  full_name: z.string().trim().min(2, "Enter a name.").max(80),
  email: z.email("Enter a valid email.").trim().toLowerCase(),
  role: roleSchema,
  password: passwordSchema,
});

const BANNED_FOREVER = "876000h"; // ~100 years

export async function createStaffUser(_prev: CreateUserState, formData: FormData): Promise<CreateUserState> {
  const session = await requireOwner();
  const parsed = createSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors };
  }
  const { full_name, email, role, password } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (error || !data.user) {
    const exists = error?.message.toLowerCase().includes("already");
    if (!exists) console.error("createStaffUser failed", error?.status, error?.message);
    return { error: exists ? "A user with this email already exists." : "Couldn't create the user. Please try again." };
  }

  // The on_auth_user_created trigger made a 'staff' profile; set name + role explicitly.
  const { error: profileError } = await session.supabase
    .from("profiles")
    .update({ full_name, role })
    .eq("user_id", data.user.id);
  if (profileError) {
    console.error("createStaffUser profile update failed", profileError.code, profileError.message);
    return { error: "User created, but the role couldn't be saved. Set it from the list." };
  }
  return { ok: true };
}

async function ownerCount(session: Awaited<ReturnType<typeof requireOwner>>): Promise<number> {
  const { count } = await session.supabase.from("profiles").select("user_id", { count: "exact", head: true }).eq("role", "owner");
  return count ?? 0;
}

export async function setUserRole(userId: string, role: "owner" | "staff"): Promise<UserActionResult> {
  const session = await requireOwner();
  const parsedRole = roleSchema.safeParse(role);
  if (!UUID_RE.test(userId) || !parsedRole.success) return { ok: false, error: "Invalid request." };
  if (userId === session.userId) return { ok: false, error: "You can't change your own role." };
  if (parsedRole.data === "staff" && (await ownerCount(session)) <= 1) {
    return { ok: false, error: "There must be at least one owner." };
  }

  const { error } = await session.supabase.from("profiles").update({ role: parsedRole.data }).eq("user_id", userId);
  if (error) {
    console.error("setUserRole failed", error.code, error.message);
    return { ok: false, error: "Couldn't change the role." };
  }
  return { ok: true };
}

/** Disable = block sign-in (ban). The account, its listings and history are kept. */
export async function setUserActive(userId: string, active: boolean): Promise<UserActionResult> {
  const session = await requireOwner();
  if (!UUID_RE.test(userId)) return { ok: false, error: "Invalid request." };
  if (userId === session.userId) return { ok: false, error: "You can't disable your own account." };

  const { error } = await createAdminClient().auth.admin.updateUserById(userId, {
    ban_duration: active ? "none" : BANNED_FOREVER,
  });
  if (error) {
    console.error("setUserActive failed", error.status, error.message);
    return { ok: false, error: "Couldn't update the account." };
  }
  return { ok: true };
}

export async function resetUserPassword(userId: string, password: string): Promise<UserActionResult> {
  await requireOwner();
  const parsed = passwordSchema.safeParse(password);
  if (!UUID_RE.test(userId)) return { ok: false, error: "Invalid request." };
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password." };

  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password: parsed.data });
  if (error) {
    console.error("resetUserPassword failed", error.status, error.message);
    return { ok: false, error: "Couldn't set the password." };
  }
  return { ok: true };
}
