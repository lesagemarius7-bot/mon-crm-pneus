import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Lazy singleton: avoids re-creating a connection pool on every Next.js hot
// reload in dev, and avoids evaluating POSTGRES_PRISMA_URL at module load
// time (which would crash `next build` before env vars are provisioned).
//
// Uses the pooled connection (pgbouncer, port 6543) — safe for the many
// short-lived connections a serverless/Fluid Compute environment opens.
// Migrations use the direct connection instead (see prisma7.config.ts).
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const rawConnectionString = process.env.POSTGRES_PRISMA_URL;
  if (!rawConnectionString) {
    throw new Error(
      "POSTGRES_PRISMA_URL is not set. Run `vercel env pull .env.local` to sync Supabase env vars."
    );
  }
  // Strip query params (sslmode=require, pgbouncer=true, ...) — when
  // present, pg's own connection-string parsing wins over the explicit
  // `ssl` option below and re-triggers full chain verification against
  // Supabase's pooler cert, which errors as a self-signed chain.
  const connectionString = rawConnectionString.split("?")[0];

  // Supabase's pooler presents a cert chain Node's default trust store
  // doesn't validate; relax verification the same way Supabase's own docs
  // recommend for the `pg` driver (TLS encryption itself stays on — only
  // CA chain validation is skipped).
  const adapter = new PrismaPg({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  return new PrismaClient({ adapter });
}

// Call this at the top of Server Components / Server Actions / Route
// Handlers: `const prisma = getPrisma()`. Deliberately not exported as a
// pre-wrapped Proxy singleton — that pattern breaks libraries that inspect
// the client object (property/method checks), so a plain lazy getter is
// used instead.
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}
