import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Prisma 7 dropped the bundled query engine + inline datasource url — the
// client now needs an explicit driver adapter. We're already on Neon
// (lib/db.ts uses the same DATABASE_URL via @neondatabase/serverless for
// orders), so @prisma/adapter-neon is the natural fit here too.
function createClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

// Standard Next.js singleton — avoids exhausting Postgres connections from
// hot-reloading in dev (each reload would otherwise instantiate a new client).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
