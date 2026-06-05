import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();
const seedPassword = process.env.DEPLOY_SEED_PASSWORD;

function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(value, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function ensureAccount(email, displayName, role) {
  const existing = await prisma.account.findUnique({ where: { email } });
  const passwordHash = seedPassword ? hashPassword(seedPassword) : undefined;

  if (!existing && !passwordHash) {
    throw new Error(`Missing ${email}. Set DEPLOY_SEED_PASSWORD to create seed login accounts.`);
  }

  const account = await prisma.account.upsert({
    where: { email },
    update: {
      displayName,
      role,
      isActive: true,
      ...(passwordHash ? { passwordHash } : {})
    },
    create: {
      email,
      displayName,
      role,
      isActive: true,
      passwordHash
    }
  });

  await prisma.accountRole.upsert({
    where: { accountId_role: { accountId: account.id, role } },
    update: {},
    create: { accountId: account.id, role }
  });

  await prisma.accountSettings.upsert({
    where: { accountId: account.id },
    update: {},
    create: { accountId: account.id }
  });

  return account;
}

async function main() {
  const admin = await ensureAccount("admin@dcreator.vn", "dCreator Admin", Role.ADMIN);
  await prisma.accountRole.upsert({
    where: { accountId_role: { accountId: admin.id, role: Role.OPS } },
    update: {},
    create: { accountId: admin.id, role: Role.OPS }
  });

  await ensureAccount("brand@dcreator.vn", "dCreator Brand", Role.BRAND_OWNER);
  await ensureAccount("creator@dcreator.vn", "dCreator Creator", Role.CREATOR);
  await ensureAccount("user@dcreator.vn", "dCreator User", Role.USER);

  await prisma.adminSetting.upsert({
    where: { scope: "global" },
    update: {},
    create: { scope: "global" }
  });

  console.log("Login-only seed ready:");
  console.log("- ADMIN/OPS: admin@dcreator.vn");
  console.log("- BRAND: brand@dcreator.vn");
  console.log("- CREATOR: creator@dcreator.vn");
  console.log("- USER: user@dcreator.vn");
  console.log("No campaign, product, brand, wallet, payment, voucher, mission, or analytics data was seeded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
