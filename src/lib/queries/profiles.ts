import "server-only";

import { getPrisma } from "@/lib/prisma";

/**
 * Assignable members for the "Propriétaire / Assigné à" pickers across the
 * CRM — sourced directly from `profiles`, which mirrors Supabase Auth's
 * registered users (see the `handle_new_user` trigger).
 */
export async function listProfileOptions() {
  const prisma = getPrisma();
  return prisma.profile.findMany({
    orderBy: [{ fullName: "asc" }, { email: "asc" }],
    select: { id: true, fullName: true, email: true, avatarUrl: true },
  });
}

export type ProfileOption = Awaited<ReturnType<typeof listProfileOptions>>[number];
