// CommonJS seed script — run with: node scripts/seed-superadmin.cjs
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const username = "DucNguyen";
  const plainPassword = "Duc365bmt";

  const existing = await prisma.user.findFirst({
    where: { role: "superadmin" },
  });

  if (existing) {
    console.log(`Superadmin already exists: ${existing.username} (${existing.id})`);
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

  console.log("✅ Superadmin created:");
  console.log(`   ID:       ${user.id}`);
  console.log(`   Username: ${user.username}`);
  console.log(`   Role:     ${user.role}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
