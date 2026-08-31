import "server-only";

import { createClient } from "@/lib/supabase/server";

/** The signed-in user's id, matching public.profiles.id (see the
 * handle_new_user trigger). Returns null when unauthenticated. */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
