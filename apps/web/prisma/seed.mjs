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

  const creator = await prisma.account.upsert({
    where: { email: "creator@dcreator.local" },
    update: {},
    create: {
      email: "creator@dcreator.local",
      displayName: "Creator Demo",
      role: Role.CREATOR
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

  const campaign = await prisma.campaign.upsert({
    where: { slug: "spring-ugc-2026" },
    update: {
      brandId: brand.id,
      title: "Campaign Spring UGC",
      brief: "Tao noi dung review va livestream",
      budgetVnd: 50000000,
      status: CampaignStatus.ACTIVE
    },
    create: {
      brandId: brand.id,
      slug: "spring-ugc-2026",
      title: "Campaign Spring UGC",
      brief: "Tao noi dung review va livestream",
      budgetVnd: 50000000,
      status: CampaignStatus.ACTIVE
    }
  });

  const mission = await prisma.mission.upsert({
    where: { id: `${campaign.id}_mission_review_60s` },
    update: {
      title: "Quay video review 60s",
      description: "Dang video cong dong theo brief",
      rewardPoints: 500,
      status: MissionStatus.OPEN
    },
    create: {
      id: `${campaign.id}_mission_review_60s`,
      campaignId: campaign.id,
      title: "Quay video review 60s",
      description: "Dang video cong dong theo brief",
      rewardPoints: 500,
      status: MissionStatus.OPEN
    }
  });

  await prisma.missionSubmission.upsert({
    where: { id: `${mission.id}_creator_demo_1` },
    update: {
      proofUrl: "https://example.com/proof/creator-demo-1",
      note: "Nop proof lan 1"
    },
    create: {
      id: `${mission.id}_creator_demo_1`,
      missionId: mission.id,
      creatorId: creator.id,
      proofUrl: "https://example.com/proof/creator-demo-1",
      note: "Nop proof lan 1"
    }
  });

  await prisma.reward.upsert({
    where: { id: `${campaign.id}_reward_spring100` },
    update: {
      title: "Voucher giam 100K",
      pointsCost: 1000,
      stock: 200,
      voucherCode: "SPRING100",
      isActive: true
    },
    create: {
      id: `${campaign.id}_reward_spring100`,
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