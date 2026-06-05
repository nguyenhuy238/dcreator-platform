import { PrismaClient, CampaignStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const emails = ["admin@dcreator.vn", "brand@dcreator.vn", "creator@dcreator.vn", "user@dcreator.vn"];
  const accounts = await prisma.account.findMany({ where: { email: { in: emails } }, select: { email: true, role: true, isActive: true } });
  const activeCampaigns = await prisma.campaign.count({ where: { status: CampaignStatus.ACTIVE, isPublic: true } });
  const rewards = await prisma.reward.count();
  const missions = await prisma.mission.count();
  const wallets = await prisma.wallet.count({ where: { user: { email: { in: emails } } } });

  const foundEmails = new Set(accounts.map((account) => account.email));
  const missing = emails.filter((email) => !foundEmails.has(email));

  console.log("Deploy seed verification:");
  console.log(`- seed accounts: ${accounts.length}/4`);
  console.log(`- seed wallets: ${wallets}/4`);
  console.log(`- active public campaigns: ${activeCampaigns}`);
  console.log(`- rewards: ${rewards}`);
  console.log(`- missions: ${missions}`);

  if (missing.length > 0) throw new Error(`Missing seed accounts: ${missing.join(", ")}`);
  if (wallets < 4) throw new Error("Missing seed wallets.");
  if (activeCampaigns < 1) throw new Error("No active public campaign found.");
  if (rewards < 1) throw new Error("No rewards found.");
  if (missions < 1) throw new Error("No missions found.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
