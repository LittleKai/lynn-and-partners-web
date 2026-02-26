/**
 * Seed script: Creates the initial superadmin account.
 *
 * Run with:
 *   npx ts-node --project tsconfig.json -e "require('./scripts/seed-superadmin.ts')"
 *
 * Or use the HTTP endpoint (recommended for production):
 *   POST /api/auth/init
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = "DucNguyen";
  const plainPassword = "Duc365bmt";

  const existing = await prisma.user.findFirst({
    where: { role: "superadmin" },
  });

  if (existing) {
    console.log(
      `Superadmin already exists: ${existing.username} (${existing.id})`
    );
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);

  const user = await prisma.user.create({
    data: {
      username,
      name: "Duc Nguyen",
      password: hashedPassword,
      role: "superadmin",
      createdAt: new Date(),
    },
  });

  console.log(`Superadmin created successfully:`);
  console.log(`  ID:       ${user.id}`);
  console.log(`  Username: ${user.username}`);
  console.log(`  Role:     ${user.role}`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
