// Read by the Prisma CLI (generate/db push/migrate) — Next.js itself never
// loads this file. Runtime PrismaClient config (the Neon driver adapter)
// lives in lib/prisma.ts instead; both point at the same DATABASE_URL.
// Next.js's own convention is .env.local (not .env) — point dotenv at it
// explicitly so the CLI sees the same DATABASE_URL the app uses.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
