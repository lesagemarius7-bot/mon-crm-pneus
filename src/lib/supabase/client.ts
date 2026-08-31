import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/**
 * Supabase client for use in Client Components (browser). Handles Auth,
 * plus Realtime subscriptions (see useRealtimeSync) — data reads/writes
 * still go through Prisma Server Actions instead (see src/lib/prisma.ts).
 *
 * Memoized: every caller on a given page shares one client instance, so
 * Realtime subscriptions reuse a single authenticated WebSocket instead of
 * each component opening its own (and to avoid the "Multiple GoTrueClient
 * instances" warning).
 */
export function createClient() {
  client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return client;
}
