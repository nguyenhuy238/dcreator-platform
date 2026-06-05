import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DIRECT_URL or DATABASE_URL is required for deploy backup.");
  process.exit(1);
}

const backupDir = resolve(process.env.DEPLOY_DB_BACKUP_DIR ?? "tmp/deploy-db-backups");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = resolve(backupDir, `deploy-data-${timestamp}.dump`);

mkdirSync(dirname(outputPath), { recursive: true });

const args = [
  "--format=custom",
  "--no-owner",
  "--no-acl",
  "--file",
  outputPath,
  databaseUrl
];

console.log(`Creating deploy database backup: ${outputPath}`);

const child = spawn("pg_dump", args, { stdio: "inherit", shell: false });

child.on("exit", (code) => {
  if (code === 0) {
    console.log(`Backup complete: ${outputPath}`);
    return;
  }

  console.error("pg_dump failed. Install PostgreSQL client tools or run a provider snapshot before reset.");
  process.exit(code ?? 1);
});
