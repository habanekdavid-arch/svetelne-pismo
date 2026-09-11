// One-off admin account bootstrap. Run with:
//   node --env-file=.env.local scripts/seed-admin.mjs <email> <password>
// Upserts so re-running with a new password just resets it.
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error("Usage: node --env-file=.env.local scripts/seed-admin.mjs <email> <password>");
  process.exit(1);
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const passwordHash = await bcrypt.hash(password, 10);

const admin = await prisma.adminUser.upsert({
  where: { email: email.toLowerCase() },
  update: { passwordHash },
  create: { email: email.toLowerCase(), passwordHash },
});

console.log(`Admin user ready: ${admin.email}`);
await prisma.$disconnect();
