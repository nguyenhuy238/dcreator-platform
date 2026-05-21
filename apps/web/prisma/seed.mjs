import { PrismaClient, Role, CampaignStatus, MissionStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const brand = await prisma.account.upsert({
    where: { email: "brand@dcreator.local" },
    update: {},
    create: {
      email: "brand@dcreator.local",
      displayName: "Brand Demo",
      role: Role.BRAND
    }
  });

  const user = await prisma.account.upsert({
    where: { email: "user@dcreator.local" },
    update: {},
    create: {
      email: "user@dcreator.local",
      displayName: "User Demo",
      role: Role.USER
    }
  });

  const campaign = await prisma.campaign.create({
    data: {
      brandId: brand.id,
      title: "Campaign Spring UGC",
      brief: "Tao noi dung review va livestream",
      budgetVnd: 50000000,
      status: CampaignStatus.ACTIVE
    }
  });

  await prisma.mission.create({
    data: {
      campaignId: campaign.id,
      title: "Quay video review 60s",
      description: "Dang video cong dong theo brief",
      rewardPoints: 500,
      status: MissionStatus.OPEN
    }
  });

  await prisma.reward.create({
    data: {
      campaignId: campaign.id,
      title: "Voucher giam 100K",
      pointsCost: 1000,
      stock: 200,
      voucherCode: "SPRING100",
      isActive: true
    }
  });

  await prisma.wallet.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      pointsBalance: 2000,
      cashBalanceVnd: 0
    }
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
