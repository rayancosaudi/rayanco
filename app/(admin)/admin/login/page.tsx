import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";
import { ArrowIcon, ShieldCheckIcon } from "@/components/icons";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Sign in" };

const features = [
  { title: "List from site", text: "Snap photos on your phone — they're compressed and uploaded automatically." },
  { title: "Approve & publish", text: "Review pending listings and push them live in one tap." },
  { title: "Track enquiries", text: "See WhatsApp, call and form leads for every listing." },
];

/** Industrial grid texture drawn with CSS gradients (no extra image request). */
const gridTexture =
  "bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:48px_48px]";

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <main className="min-h-dvh bg-steel-50 lg:grid lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
      {/* Brand panel: compact band on mobile, full-height side panel on desktop. */}
      <section className="relative isolate overflow-hidden bg-steel-950 text-white">
        {/* TODO(owner): replace with a real Rayanco yard / plant photo. */}
        <Image
          src="/assets/images/Hero_bg.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="-z-20 object-cover object-[45%_center] opacity-60"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b from-steel-950/80 via-steel-950/85 to-steel-950 lg:bg-gradient-to-tr lg:from-steel-950 lg:via-steel-950/85 lg:to-steel-900/40"
        />
        <div aria-hidden="true" className={`absolute inset-0 -z-10 ${gridTexture}`} />
        <div aria-hidden="true" className="absolute inset-y-0 start-0 -z-10 w-1 bg-accent-500" />

        <div className="flex h-full flex-col px-6 pb-16 pt-8 sm:px-10 lg:min-h-dvh lg:px-14 lg:py-12 xl:px-20">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center gap-2.5 rounded-md" aria-label="Rayanco home">
              <Image
                src={site.logo.src}
                alt=""
                width={site.logo.width}
                height={site.logo.height}
                className="h-10 w-auto lg:h-12"
              />
              <span className="font-display text-xl font-bold tracking-tight lg:text-2xl">{site.name}</span>
            </Link>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-ui text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur">
              Staff portal
            </span>
          </div>

          <div className="mt-8 lg:my-auto lg:max-w-lg lg:py-12">
            <p className="flex items-center gap-2 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-accent-400">
              <span aria-hidden="true" className="h-px w-6 bg-accent-400" />
              Rayanco Admin
            </p>
            <p className="mt-3 font-display text-2xl font-bold leading-tight sm:text-3xl lg:text-5xl">
              Manage the yard, <span className="text-accent-400">from anywhere.</span>
            </p>
            <p className="mt-3 hidden max-w-md text-base text-white/70 sm:block lg:mt-5 lg:text-lg">
              List used equipment straight from site, approve listings and follow every buyer enquiry.
            </p>

            <ul className="mt-10 hidden space-y-5 lg:block">
              {features.map((f, i) => (
                <li key={f.title} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 font-display text-sm font-bold text-accent-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-semibold text-white">{f.title}</p>
                    <p className="mt-0.5 text-sm text-white/60">{f.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto hidden items-center justify-between gap-4 border-t border-white/10 pt-6 font-ui text-xs text-white/55 lg:flex">
            <span>Dammam · Jubail — trading since 1995</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheckIcon className="size-4 text-accent-400" />
              ISO 9001 · ISO 14001
            </span>
          </div>
        </div>
      </section>

      {/* Form panel */}
      <section className="relative -mt-8 px-4 pb-10 sm:px-6 lg:mt-0 lg:flex lg:flex-col lg:justify-center lg:px-12 lg:py-12">
        <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_24px_60px_-20px_rgb(11_34_54/0.35)] ring-1 ring-steel-100 sm:p-8 lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0">
          <Suspense>
            <LoginFormWithNext searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="mx-auto mt-8 w-full max-w-md text-center text-sm text-steel-500 lg:text-start">
          <Link href="/" className="group inline-flex items-center gap-1.5 font-semibold text-steel-600 hover:text-accent-600">
            <ArrowIcon className="size-4 rotate-180 transition-transform group-hover:-translate-x-0.5" />
            Back to rayanco.com
          </Link>
        </p>
      </section>
    </main>
  );
}

async function LoginFormWithNext({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}
