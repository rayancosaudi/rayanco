import "server-only";
import { z } from "zod";

/** Server-only secrets. Importing this from a client component fails the build. */
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Bearer secret Vercel Cron sends to /api/cron/*. Optional so local dev works without it.
  CRON_SECRET: z.string().min(16).optional(),
});

let cached: z.infer<typeof serverSchema> | undefined;

/** Lazily validated so builds without secrets still succeed for public pages. */
export function serverEnv() {
  cached ??= serverSchema.parse(process.env);
  return cached;
}
