"use client";

import { useActionState, useState, type SVGProps } from "react";
import { signIn, type SignInState } from "@/app/actions/auth";
import { ArrowIcon, MailIcon } from "@/components/icons";

const fieldClass =
  "block h-12 w-full rounded-xl border-[1.5px] border-steel-200 bg-white ps-11 text-base text-steel-900 shadow-sm transition placeholder:text-steel-400 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15 disabled:bg-steel-50";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <div className="mb-7">
        <span className="grid size-12 place-items-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-100">
          <LockIcon className="size-6" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold text-steel-900 sm:text-3xl">Welcome back</h1>
        <p className="mt-1.5 text-sm text-steel-500 sm:text-base">Sign in to manage listings and enquiries.</p>
      </div>

      <form action={action} className="space-y-5">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-steel-700">
            Email
          </label>
          <div className="relative">
            <MailIcon className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-steel-400" />
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@rayanco.com"
              required
              disabled={pending}
              defaultValue={state?.email}
              aria-invalid={state?.error ? true : undefined}
              className={`${fieldClass} pe-3`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-steel-700">
            Password
          </label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-steel-400" />
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              required
              disabled={pending}
              aria-invalid={state?.error ? true : undefined}
              className={`${fieldClass} pe-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute end-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-steel-400 transition hover:bg-steel-50 hover:text-steel-700"
            >
              {showPassword ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
            </button>
          </div>
        </div>

        {state?.error ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-semibold text-red-700"
          >
            <AlertIcon className="mt-px size-5 shrink-0" />
            {state.error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-500 text-base font-bold text-white shadow-[0_10px_24px_-10px_rgb(31_157_85/0.7)] transition hover:bg-accent-600 focus-visible:ring-4 focus-visible:ring-accent-500/30 disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? (
            <>
              <SpinnerIcon className="size-5 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowIcon className="size-5 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-7 border-t border-steel-100 pt-5 text-xs leading-relaxed text-steel-500">
        <p className="flex items-center gap-1.5 font-semibold text-steel-600">
          <LockIcon className="size-3.5 text-accent-600" />
          Secure staff area
        </p>
        <p className="mt-1">Accounts are created by the owner. Forgot your password? Ask the owner to reset it.</p>
      </div>
    </div>
  );
}

type IconProps = SVGProps<SVGSVGElement>;

function Outline({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

function LockIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </Outline>
  );
}

function EyeIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Outline>
  );
}

function EyeOffIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.7 3.5M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.3-1.1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Outline>
  );
}

function AlertIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16.2v.3" />
    </Outline>
  );
}

function SpinnerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
