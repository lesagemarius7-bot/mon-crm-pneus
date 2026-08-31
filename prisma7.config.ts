// Loads env vars from .env.local (the file Vercel writes to via
// `vercel env pull` / integration provisioning) instead of the default .env,
// so Prisma CLI commands (migrate, studio, generate) use the same Supabase
// Postgres connection as the Next.js app.
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local" });

export default defineConfig({
  experimental: {
    externalTables: true,
  },
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
    // The shadow DB Prisma spins up to validate migrations is a plain
    // Postgres instance — it doesn't know about Supabase's `auth` schema,
    // which our profile-sync trigger migration references. Stub just
    // enough of it (id/email/raw_user_meta_data) for the migration to
    // diff cleanly; the real database already has the full auth.users.
    initShadowDb: `
      create schema if not exists auth;
      create table if not exists auth.users (
        id uuid primary key,
        email text,
        raw_user_meta_data jsonb
      );
    `,
  },
  // Migrate/Studio/introspection need a direct (non-pooled) connection.
  // Runtime queries from the app use the pooled POSTGRES_PRISMA_URL instead,
  // wired up via a driver adapter in src/lib/prisma.ts.
  datasource: {
    url: process.env["POSTGRES_URL_NON_POOLING"],
  },
});
