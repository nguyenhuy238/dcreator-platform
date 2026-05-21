import {
  PrismaClient,
  Role,
  CampaignStatus,
  CampaignType,
  CampaignCategory,
  MissionStatus,
  RewardType
} from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = "Test@123456";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const defaultAccounts = [
    { email: "user@dcreator.local", displayName: "User Demo", role: Role.USER },
    { email: "creator@dcreator.local", displayName: "Creator Demo", role: Role.CREATOR },
    { email: "brand@dcreator.local", displayName: "Brand Owner Demo", role: Role.BRAND_OWNER },
    { email: "brand.staff@dcreator.local", displayName: "Brand Staff Demo", role: Role.BRAND_STAFF },
    { email: "admin@dcreator.local", displayName: "Admin Demo", role: Role.ADMIN },
    { email: "ops@dcreator.local", displayName: "Ops Demo", role: Role.OPS }
  ];

  const seededAccounts = {};
  for (const account of defaultAccounts) {
    const upserted = await prisma.account.upsert({
      where: { email: account.email },
      update: {
        displayName: account.displayName,
        role: account.role,
        isActive: true
      },
      create: {
        email: account.email,
        displayName: account.displayName,
        role: account.role,
        isActive: true,
        passwordHash: hashPassword(DEFAULT_PASSWORD)
      }
    });
    seededAccounts[account.role] = upserted;
  }

  const brand = seededAccounts[Role.BRAND_OWNER];
  const creator = seededAccounts[Role.CREATOR];
  const user = seededAccounts[Role.USER];

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

  for (const account of Object.values(seededAccounts)) {
    await prisma.wallet.upsert({
      where: { userId: account.id },
      update: {},
      create: {
        userId: account.id,
        pointsBalance: account.id === user.id ? 2000 : 1000,
        cashBalanceVnd: 0
      }
    });
  }

  console.log("Seeded default test accounts (password: Test@123456):");
  for (const account of defaultAccounts) {
    console.log(`- ${account.role}: ${account.email}`);
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
