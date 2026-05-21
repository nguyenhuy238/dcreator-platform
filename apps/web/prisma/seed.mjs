import {
  PrismaClient,
  Role,
  CampaignStatus,
  CampaignType,
  CampaignCategory,
  MissionStatus,
  RewardType
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const brand = await prisma.account.upsert({
    where: { email: "brand@dcreator.local" },
    update: {},
    create: {
      email: "brand@dcreator.local",
      displayName: "Brand Demo",
      role: Role.BRAND_OWNER
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

  const campaignSeeds = [
    ["spring-ugc-2026", "Spring UGC Challenge", CampaignType.SPONSORSHIP, CampaignCategory.LIFESTYLE, 50000000, 32000000, 30],
    ["tech-week-fund", "Tech Week Creator Fund", CampaignType.DONATION, CampaignCategory.TECH, 80000000, 61000000, 20],
    ["foodie-preorder-box", "Foodie Preorder Box", CampaignType.PREORDER, CampaignCategory.FOOD, 60000000, 45000000, 12],
    ["beauty-livefest", "Beauty Live Fest", CampaignType.COMMUNITY, CampaignCategory.BEAUTY, 40000000, 11000000, 8],
    ["edu-maker-grant", "Edu Maker Grant", CampaignType.DONATION, CampaignCategory.EDUCATION, 70000000, 28000000, 18],
    ["streetwear-drop", "Streetwear Limited Drop", CampaignType.PREORDER, CampaignCategory.FASHION, 90000000, 74000000, 25]
  ];

  for (const [slug, title, campaignType, category, targetAmountVnd, fundedAmountVnd, daysLeft] of campaignSeeds) {
    const campaign = await prisma.campaign.upsert({
      where: { slug },
      update: {
        brandId: brand.id,
        creatorId: creator.id,
        title,
        brief: `Brief for ${title}`,
        coverImageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1400",
        campaignType,
        category,
        targetAmountVnd,
        fundedAmountVnd,
        budgetVnd: targetAmountVnd,
        status: CampaignStatus.ACTIVE,
        isPublic: true,
        endsAt: new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000)
      },
      create: {
        brandId: brand.id,
        creatorId: creator.id,
        slug,
        title,
        brief: `Brief for ${title}`,
        coverImageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1400",
        campaignType,
        category,
        targetAmountVnd,
        fundedAmountVnd,
        budgetVnd: targetAmountVnd,
        status: CampaignStatus.ACTIVE,
        isPublic: true,
        endsAt: new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000)
      }
    });

    await prisma.mission.upsert({
      where: { id: `${campaign.id}_mission_1` },
      update: {
        title: "Tao video 60s",
        description: "Video challenge theo brief",
        rewardPoints: 500,
        status: MissionStatus.OPEN
      },
      create: {
        id: `${campaign.id}_mission_1`,
        campaignId: campaign.id,
        title: "Tao video 60s",
        description: "Video challenge theo brief",
        rewardPoints: 500,
        status: MissionStatus.OPEN
      }
    });

    await prisma.reward.upsert({
      where: { id: `${campaign.id}_reward_1` },
      update: {
        title: "Voucher 100K",
        description: "Voucher dung trong he sinh thai dCreator",
        rewardType: RewardType.DIGITAL_VOUCHER,
        pointsCost: 1000,
        stockTotal: 100,
        stockRemaining: 100,
        isActive: true,
        estimatedDeliveryAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      },
      create: {
        id: `${campaign.id}_reward_1`,
        campaignId: campaign.id,
        title: "Voucher 100K",
        description: "Voucher dung trong he sinh thai dCreator",
        rewardType: RewardType.DIGITAL_VOUCHER,
        pointsCost: 1000,
        stockTotal: 100,
        stockRemaining: 100,
        isActive: true,
        estimatedDeliveryAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      }
    });
  }

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
