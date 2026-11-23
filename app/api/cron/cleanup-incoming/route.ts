import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env.server";
import { deleteObjects, INCOMING_BUCKET, listOlderThan } from "@/lib/storage";

/**
 * GET /api/cron/cleanup-incoming — daily Vercel Cron job (see vercel.json).
 * Deletes fallback uploads in the listing-incoming bucket older than 24 h (CLAUDE.md §8a step 3).
 */

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stale = await listOlderThan(INCOMING_BUCKET, MAX_AGE_MS);
  await deleteObjects(INCOMING_BUCKET, stale);
  return NextResponse.json({ deleted: stale.length });
}
