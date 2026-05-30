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
    ["spring-ugc-2026", "UGC 15 video - Sữa hạt X cho Gen Z", CampaignCategory.LIFESTYLE, 50000000, 32000000, 30, "Ra mắt sản phẩm mới và test thị trường Gen Z", "TikTok, Shopee, Instagram", "Video review, Livestream"],
    ["tech-week-fund", "Combo phụ kiện tech - Review chân thực", CampaignCategory.TECH, 80000000, 61000000, 20, "Tăng doanh thu trên social commerce", "TikTok, YouTube, Facebook", "Video review, Post ảnh"],
    ["foodie-preorder-box", "Set đồ uống mùa hè - Creator challenge", CampaignCategory.FOOD, 60000000, 45000000, 12, "Đẩy đơn trong mùa cao điểm", "TikTok, Facebook, Instagram", "Video review, Nhiệm vụ user mua-review-giới thiệu"],
    ["beauty-livefest", "Beauty Live Fest - 20 creator seeding", CampaignCategory.BEAUTY, 40000000, 11000000, 8, "Tăng độ phủ thương hiệu làm đẹp", "TikTok, Shopee", "Video review, Livestream"],
    ["edu-maker-grant", "Khoá học AI cơ bản - UGC campaign", CampaignCategory.EDUCATION, 70000000, 28000000, 18, "Gây quỹ học bổng và tăng chuyển đổi khoá học", "TikTok, YouTube", "Video review, Post ảnh"],
    ["streetwear-drop", "Streetwear Limited Drop - 10 video seeding", CampaignCategory.FASHION, 90000000, 74000000, 25, "Ra mắt BST mới và tăng doanh thu", "TikTok, Instagram, Facebook", "Video review, Livestream, Post ảnh"]
  ];

  const ugcVideoQuotaBySlug = {
    "foodie-preorder-box": 20
  };

  for (const [slug, title, category, targetAmountVnd, fundedAmountVnd, daysLeft, objective, priorityChannels, missionTypes] of campaignSeeds) {
    const ugcVideoQuota = ugcVideoQuotaBySlug[slug] ?? null;
    const campaign = await prisma.campaign.upsert({
      where: { slug },
      update: {
        brandId: brand.id,
        creatorId: creator.id,
        title,
        brief: `Chiến dịch ${title}. Creator review chân thực, nêu rõ trải nghiệm và CTA mua hàng.`,
        coverImageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1400",
        campaignType: CampaignType.COMMUNITY,
        category,
        objective,
        priorityChannels,
        missionTypes,
        creatorCommissionPercent: 12,
        userCommissionPercent: 5,
        bonusBudgetVnd: 5000000,
        targetAmountVnd,
        fundedAmountVnd,
        ugcVideoQuota,
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
        brief: `Chiến dịch ${title}. Creator review chân thực, nêu rõ trải nghiệm và CTA mua hàng.`,
        coverImageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1400",
        campaignType: CampaignType.COMMUNITY,
        category,
        objective,
        priorityChannels,
        missionTypes,
        creatorCommissionPercent: 12,
        userCommissionPercent: 5,
        bonusBudgetVnd: 5000000,
        targetAmountVnd,
        fundedAmountVnd,
        ugcVideoQuota,
        budgetVnd: targetAmountVnd,
        status: CampaignStatus.ACTIVE,
        isPublic: true,
        endsAt: new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000)
      }
    });

    await prisma.mission.upsert({
      where: { id: `${campaign.id}_mission_1` },
      update: {
        title: "Quay video review 9:16",
        description: "Video seeding theo brief campaign",
        rewardPoints: 500,
        status: MissionStatus.OPEN
      },
      create: {
        id: `${campaign.id}_mission_1`,
        campaignId: campaign.id,
        title: "Quay video review 9:16",
        description: "Video seeding theo brief campaign",
        rewardPoints: 500,
        status: MissionStatus.OPEN
      }
    });

    await prisma.reward.upsert({
      where: { id: `${campaign.id}_reward_1` },
      update: {
        title: "Mẫu sản phẩm review",
        description: "Gói sản phẩm dùng để creator thực hiện video seeding",
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
        title: "Mẫu sản phẩm review",
        description: "Gói sản phẩm dùng để creator thực hiện video seeding",
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
