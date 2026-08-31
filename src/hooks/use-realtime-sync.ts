"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

/** Physical table names (see @@map in prisma/schema.prisma) this app can
 * listen to via Supabase Realtime. */
export type RealtimeTable = "companies" | "contacts" | "deals" | "tasks" | "activities";

type ChangePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

/**
 * Subscribes to INSERT/UPDATE/DELETE Postgres Changes (Supabase Realtime)
 * on `tables` so every open tab/user stays live without polling.
 *
 * `onChange` runs on every event — default is `router.refresh()`, which
 * re-fetches the nearest Server Component's data and flows fresh props
 * down (fine for components that render server-provided data directly,
 * e.g. CompaniesTable). Pass a custom `onChange` for components that
 * self-fetch their own data client-side instead (e.g. TasksView) — call
 * their own refetch function there rather than relying on router.refresh().
 *
 * `tables` must be a stable reference: define it as a module-level
 * constant outside the component, not an inline array literal, since it's
 * used as an effect dependency as-is.
 */
export function useRealtimeSync(
  tables: RealtimeTable[],
  onChange?: (payload: ChangePayload) => void,
  options?: { enabled?: boolean }
) {
  const router = useRouter();
  const enabled = options?.enabled ?? true;

  // Keeps the effect below from needing `onChange` in its deps (and thus
  // from re-subscribing whenever a caller passes a fresh inline function).
  // Updated in its own effect (not during render) per this repo's ref
  // rules — see react-hooks/refs.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const channel = supabase.channel(`sync:${tables.join(",")}`);

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload: ChangePayload) => {
          if (onChangeRef.current) onChangeRef.current(payload);
          else router.refresh();
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tables, enabled, router]);
}
