"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/app/actions/auth";
import { inputClass } from "./styles";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <label className="block text-sm font-semibold text-steel-700">
        Email
        <input name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state?.email} className={inputClass} />
      </label>
      <label className="block text-sm font-semibold text-steel-700">
        Password
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </label>
      {state?.error ? (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-full bg-accent-500 text-base font-bold text-white hover:bg-accent-600 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs text-steel-500">Accounts are created by the owner. Forgot your password? Ask the owner to reset it.</p>
    </form>
  );
}
