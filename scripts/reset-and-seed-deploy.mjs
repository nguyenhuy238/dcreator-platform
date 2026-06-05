import { spawn } from "node:child_process";

const steps = [
  ["backup", "node", ["scripts/backup-deploy-data.mjs"]],
  ["reset", "node", ["scripts/run-reset-deploy-data.mjs"]],
  ["seed accounts", "node", ["scripts/seed-deploy-accounts.mjs"]],
  ["seed clean data", "node", ["scripts/seed-clean-production-data.mjs"]],
  ["verify", "node", ["scripts/verify-deploy-seed.mjs"]]
];

function run(label, command, args) {
  console.log(`\n== ${label} ==`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed with exit code ${code ?? 1}`));
    });
  });
}

for (const [label, command, args] of steps) {
  await run(label, command, args);
}

console.log("\nDeploy reset and seed sequence complete.");
