"use client";

import dynamic from "next/dynamic";

/** Lazy, client-only chart wrappers so recharts never ships with the public site. */

const loading = () => <div className="size-full animate-pulse rounded-lg bg-steel-50" />;

export const EnquiriesChart = dynamic(() => import("./EnquiriesChart"), { ssr: false, loading });
export const StatusDonut = dynamic(() => import("./StatusDonut"), { ssr: false, loading });
