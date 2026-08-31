-- Enable Supabase Realtime (Postgres Changes) on the tables the app
-- listens to via useRealtimeSync: companies, contacts, deals, tasks,
-- activities.
--
-- Realtime's Postgres Changes replication respects Row Level Security for
-- the subscribing role. Prisma's own reads/writes go through a direct
-- connection using the Supabase "postgres" role (a superuser, see
-- src/lib/prisma.ts / prisma7.config.ts), which bypasses RLS entirely —
-- so enabling RLS here only affects the browser Supabase client (anon key
-- + authenticated session) used for Realtime, not the app's normal CRUD.
--
-- This app has no per-row ownership model (any authenticated user can see
-- all data, enforced today by proxy.ts gating every route on a session),
-- so a blanket "authenticated can read everything" policy matches
-- existing behavior exactly — it does not tighten or loosen who can see
-- what, it just makes Realtime subscribe-safe instead of appearing open
-- to anyone holding the public anon key with no session at all.

ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read for realtime" ON "companies"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read for realtime" ON "contacts"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read for realtime" ON "deals"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read for realtime" ON "tasks"
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read for realtime" ON "activities"
  FOR SELECT TO authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE "companies", "contacts", "deals", "tasks", "activities";
