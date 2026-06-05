import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { PrismaClient } from "@prisma/client";

const CONFIRM_TEXT = "RESET_DEPLOY_DATA";

function assertGuard() {
  if (process.env.ALLOW_DEPLOY_DATA_RESET !== "true") {
    throw new Error("Blocked reset: set ALLOW_DEPLOY_DATA_RESET=true.");
  }

  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  if (/localhost|127\.0\.0\.1|file:/i.test(databaseUrl) && process.env.ALLOW_LOCAL_DEPLOY_DATA_RESET !== "true") {
    throw new Error("DATABASE_URL looks local. Set ALLOW_LOCAL_DEPLOY_DATA_RESET=true if this is intentional.");
  }
}

async function assertConfirm() {
  if (process.env.RESET_DEPLOY_DATA_CONFIRM === CONFIRM_TEXT) return;

  const rl = createInterface({ input, output });
  const answer = await rl.question(`Type ${CONFIRM_TEXT} to reset deploy business data: `);
  rl.close();

  if (answer !== CONFIRM_TEXT) {
    throw new Error("Reset cancelled: confirm text did not match.");
  }
}

async function main() {
  assertGuard();
  await assertConfirm();

  const sql = readFileSync(new URL("./reset-deploy-data.sql", import.meta.url), "utf8");
  const prisma = new PrismaClient();

  try {
    console.log("Running guarded deploy data reset...");
    await prisma.$executeRawUnsafe("SET app.allow_deploy_data_reset = 'true'");
    await prisma.$executeRawUnsafe(sql);
    console.log("Deploy data reset complete. Run seed scripts before opening the app to users.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
