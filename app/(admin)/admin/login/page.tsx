import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-steel-950 px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <p className="font-display text-2xl font-bold text-steel-900">Rayanco</p>
        <h1 className="mt-1 text-sm font-semibold text-steel-500">Staff sign in</h1>
        <Suspense>
          <LoginFormWithNext searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoginFormWithNext({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}
