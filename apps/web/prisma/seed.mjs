import {
  PrismaClient,
  Role,
  CampaignStatus,
  CampaignType,
  CampaignCategory,
  MissionStatus,
  MissionLifecycleStatus,
  SocialPlatform,
  CreatorSocialLinkStatus,
  CreatorChannelVerificationStatus,
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

  const creatorSeeds = [
    {
      email: "camchi.creator@dcreator.local",
      displayName: "Cẩm Chi-hè",
      handle: "haeraya1008",
      followers: 42300,
      avatarUrl: "/uploads/creator-avatar/seed-cam-chi-avatar.png",
      category: "Lifestyle",
      location: "TP. Hồ Chí Minh"
    },
    {
      email: "trungtrachnhiem.creator@dcreator.local",
      displayName: "Trung Trách Nhiệm",
      handle: "trungtrachnhiem",
      followers: 45800,
      avatarUrl: "/uploads/creator-avatar/seed-trung-avatar.png",
      category: "Review",
      location: "Hà Nội"
    },
    {
      email: "tieuai.creator@dcreator.local",
      displayName: "Tiểu Ái",
      handle: "tieuai0511",
      followers: 54400,
      avatarUrl: "/uploads/creator-avatar/seed-tieu-ai-avatar.png",
      category: "Beauty",
      location: "Đà Nẵng"
    },
    {
      email: "sansau.creator@dcreator.local",
      displayName: "Sân sau Showbiz",
      handle: "sansau_0",
      followers: 30000,
      avatarUrl: "/uploads/creator-avatar/seed-san-sau-avatar.png",
      category: "Entertainment",
      location: "TP. Hồ Chí Minh"
    },
    {
      email: "huynhly.creator@dcreator.local",
      displayName: "Huỳnh Ly",
      handle: "iamhly__",
      followers: 29100,
      avatarUrl: "/uploads/creator-avatar/seed-huynh-ly-avatar.png",
      category: "Fashion",
      location: "Cần Thơ"
    },
    {
      email: "cris.creator@dcreator.local",
      displayName: "Cris",
      handle: "cris.dangg",
      followers: 44100,
      avatarUrl: "/uploads/creator-avatar/seed-cris-avatar.png",
      category: "Tech",
      location: "Hà Nội"
    }
  ];

  const seededCreatorAccounts = [];
  for (const item of creatorSeeds) {
    const account = await prisma.account.upsert({
      where: { email: item.email },
      update: {
        displayName: item.displayName,
        avatarUrl: item.avatarUrl,
        role: Role.CREATOR,
        isActive: true
      },
      create: {
        email: item.email,
        displayName: item.displayName,
        avatarUrl: item.avatarUrl,
        role: Role.CREATOR,
        isActive: true,
        passwordHash: hashPassword(DEFAULT_PASSWORD)
      }
    });

    await prisma.accountRole.upsert({
      where: { accountId_role: { accountId: account.id, role: Role.CREATOR } },
      update: {},
      create: { accountId: account.id, role: Role.CREATOR }
    });

    const profile = await prisma.creatorProfile.upsert({
      where: { accountId: account.id },
      update: {
        displayName: item.displayName,
        avatarUrl: item.avatarUrl,
        bio: `${item.displayName} là Creator ${item.category} trong hệ thống dCreator.`,
        mainPlatform: SocialPlatform.TIKTOK,
        socialUrl: `https://www.tiktok.com/@${item.handle}`,
        handle: item.handle,
        followerCount: item.followers,
        contentCategory: item.category,
        location: item.location,
        maxJobsPerMonth: 6
      },
      create: {
        accountId: account.id,
        displayName: item.displayName,
        avatarUrl: item.avatarUrl,
        bio: `${item.displayName} là Creator ${item.category} trong hệ thống dCreator.`,
        mainPlatform: SocialPlatform.TIKTOK,
        socialUrl: `https://www.tiktok.com/@${item.handle}`,
        handle: item.handle,
        followerCount: item.followers,
        contentCategory: item.category,
        location: item.location,
        maxJobsPerMonth: 6
      }
    });

    await prisma.creatorSocialLink.upsert({
      where: {
        creatorProfileId_platform_socialUrl: {
          creatorProfileId: profile.id,
          platform: SocialPlatform.TIKTOK,
          socialUrl: `https://www.tiktok.com/@${item.handle}`
        }
      },
      update: {
        handle: item.handle,
        followers: item.followers,
        isActive: true,
        verificationStatus: CreatorChannelVerificationStatus.VERIFIED,
        status: CreatorSocialLinkStatus.APPROVED
      },
      create: {
        creatorProfileId: profile.id,
        platform: SocialPlatform.TIKTOK,
        handle: item.handle,
        socialUrl: `https://www.tiktok.com/@${item.handle}`,
        followers: item.followers,
        isActive: true,
        verificationStatus: CreatorChannelVerificationStatus.VERIFIED,
        status: CreatorSocialLinkStatus.APPROVED
      }
    });

    seededCreatorAccounts.push(account);
  }

  const campaignSeeds = [
    ["spring-ugc-2026", "UGC 15 video - Sữa hạt X cho Gen Z", CampaignCategory.LIFESTYLE, 50000000, 32000000, 30, "Ra mắt sản phẩm mới và test thị trường Gen Z", "TikTok, Shopee, Instagram", "Video review, Livestream"],
    ["tech-week-fund", "Combo phụ kiện tech - Review chân thực", CampaignCategory.TECH, 80000000, 61000000, 20, "Tăng doanh thu trên social commerce", "TikTok, YouTube, Facebook", "Video review, Post ảnh"],
    ["foodie-preorder-box", "Set đồ uống mùa hè - Creator challenge", CampaignCategory.FOOD, 60000000, 45000000, 12, "Đẩy đơn trong mùa cao điểm", "TikTok, Facebook, Instagram", "Video review, Nhiệm vụ user mua-review-giới thiệu"],
    ["beauty-livefest", "Beauty Live Fest - 20 creator seeding", CampaignCategory.BEAUTY, 40000000, 11000000, 8, "Tăng độ phủ thương hiệu làm đẹp", "TikTok, Shopee", "Video review, Livestream"],
    ["edu-maker-grant", "Khoá học AI cơ bản - UGC campaign", CampaignCategory.EDUCATION, 70000000, 28000000, 18, "Gây quỹ học bổng và tăng chuyển đổi khoá học", "TikTok, YouTube", "Video review, Post ảnh"],
    ["streetwear-drop", "Streetwear Limited Drop - 10 video seeding", CampaignCategory.FASHION, 90000000, 74000000, 25, "Ra mắt BST mới và tăng doanh thu", "TikTok, Instagram, Facebook", "Video review, Livestream, Post ảnh"]
  ];

  for (const [slug, title, category, targetAmountVnd, fundedAmountVnd, daysLeft, objective, priorityChannels, missionTypes] of campaignSeeds) {
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

  const seededMissions = await prisma.mission.findMany({
    where: {
      campaign: {
        slug: { in: campaignSeeds.map(([slug]) => slug) }
      }
    },
    orderBy: { createdAt: "asc" },
    take: seededCreatorAccounts.length,
    select: { id: true, campaignId: true }
  });

  for (const [index, account] of seededCreatorAccounts.entries()) {
    const mission = seededMissions[index % seededMissions.length];
    if (!mission) continue;

    await prisma.missionSubmission.upsert({
      where: {
        missionId_accountId: {
          missionId: mission.id,
          accountId: account.id
        }
      },
      update: {
        lifecycleStatus: MissionLifecycleStatus.APPROVED,
        status: MissionStatus.APPROVED,
        videoUrl: `https://video.dcreator.local/demo/${account.id}`,
        socialPostUrl: `https://www.tiktok.com/@demo/video/${index + 1}`,
        proofTextNote: "Seed demo UGC video submission.",
        approvedAt: new Date()
      },
      create: {
        missionId: mission.id,
        accountId: account.id,
        lifecycleStatus: MissionLifecycleStatus.APPROVED,
        status: MissionStatus.APPROVED,
        videoUrl: `https://video.dcreator.local/demo/${account.id}`,
        socialPostUrl: `https://www.tiktok.com/@demo/video/${index + 1}`,
        proofTextNote: "Seed demo UGC video submission.",
        approvedAt: new Date()
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
  console.log(`Seeded ${creatorSeeds.length} creator profiles and ${seededCreatorAccounts.length} demo video submissions.`);
}

main().finally(async () => {
  await prisma.$disconnect();
});
