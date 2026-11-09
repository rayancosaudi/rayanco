"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { createStaffUser, type CreateUserState } from "@/app/actions/admin-users";
import { btnPrimary, cardClass, cardTitleClass, inputClass, labelClass } from "./styles";

export function CreateUserForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<CreateUserState, FormData>(createStaffUser, undefined);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  const err = state?.fieldErrors ?? {};

  return (
    <form ref={formRef} action={action} className={`${cardClass} space-y-4`}>
      <div>
        <h2 className={cardTitleClass}>Add a user</h2>
        <p className="text-sm text-steel-500">Set a temporary password and share it with them privately.</p>
      </div>

      <label className={labelClass}>
        Full name
        <input name="full_name" required autoComplete="off" className={inputClass} />
        {err.full_name ? <span className="mt-1 block font-normal text-red-700">{err.full_name}</span> : null}
      </label>
      <label className={labelClass}>
        Email
        <input name="email" type="email" required autoComplete="off" dir="ltr" className={inputClass} />
        {err.email ? <span className="mt-1 block font-normal text-red-700">{err.email}</span> : null}
      </label>
      <label className={labelClass}>
        Role
        <select name="role" defaultValue="staff" className={inputClass}>
          <option value="staff">Staff: adds listings for approval</option>
          <option value="owner">Owner: full access</option>
        </select>
      </label>
      <label className={labelClass}>
        Temporary password
        <input name="password" type="text" required minLength={8} autoComplete="new-password" dir="ltr" className={inputClass} />
        {err.password ? (
          <span className="mt-1 block font-normal text-red-700">{err.password}</span>
        ) : (
          <span className="mt-1 block text-xs font-normal text-steel-500">At least 8 characters.</span>
        )}
      </label>

      {state?.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="rounded-lg bg-accent-50 px-3 py-2 text-sm font-semibold text-accent-700">
          User created. They can sign in now.
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}
