import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components (browser). Handles Auth only
 * — data reads/writes go through Prisma Server Actions instead (see
 * src/lib/prisma.ts), so RLS policies are not the primary access-control
 * layer here.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
