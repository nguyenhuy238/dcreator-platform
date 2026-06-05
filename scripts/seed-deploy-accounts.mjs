import { randomBytes, scryptSync } from "node:crypto";
import {
  BrandMemberRole,
  BrandMemberStatus,
  BrandStatus,
  BrandSubscriptionPackageCode,
  CreatorChannelVerificationStatus,
  CreatorSocialLinkStatus,
  Role,
  SocialPlatform,
  PrismaClient
} from "@prisma/client";

const prisma = new PrismaClient();
const password = process.env.DEPLOY_SEED_PASSWORD;

if (!password) {
  console.error("DEPLOY_SEED_PASSWORD is required. Do not hardcode deploy seed passwords.");
  process.exit(1);
}

function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(value, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function upsertAccount(email, displayName, role) {
  const account = await prisma.account.upsert({
    where: { email },
    update: {
      displayName,
      role,
      isActive: true,
      passwordHash: hashPassword(password)
    },
    create: {
      email,
      displayName,
      role,
      isActive: true,
      passwordHash: hashPassword(password)
    }
  });

  await prisma.accountRole.upsert({
    where: { accountId_role: { accountId: account.id, role } },
    update: {},
    create: { accountId: account.id, role }
  });

  await prisma.accountSettings.upsert({
    where: { accountId: account.id },
    update: {},
    create: { accountId: account.id }
  });

  return account;
}

async function ensureWallet(accountId, pointsBalance, cashBalanceVnd = 0) {
  return prisma.wallet.upsert({
    where: { userId: accountId },
    update: { pointsBalance, cashBalanceVnd },
    create: { userId: accountId, pointsBalance, cashBalanceVnd }
  });
}

async function main() {
  const admin = await upsertAccount("admin@dcreator.vn", "dCreator Admin", Role.ADMIN);
  const brandOwner = await upsertAccount("brand@dcreator.vn", "dCreator Brand", Role.BRAND_OWNER);
  const creator = await upsertAccount("creator@dcreator.vn", "dCreator Creator", Role.CREATOR);
  const user = await upsertAccount("user@dcreator.vn", "dCreator User", Role.USER);

  await Promise.all([
    prisma.accountRole.upsert({
      where: { accountId_role: { accountId: admin.id, role: Role.OPS } },
      update: {},
      create: { accountId: admin.id, role: Role.OPS }
    }),
    prisma.profile.upsert({
      where: { accountId: user.id },
      update: { bio: "Fan seed account for support and voucher flows.", phone: "0900000004" },
      create: { accountId: user.id, bio: "Fan seed account for support and voucher flows.", phone: "0900000004" }
    }),
    prisma.profile.upsert({
      where: { accountId: brandOwner.id },
      update: { bio: "Brand seed account for merchant dashboard.", phone: "0900000002" },
      create: { accountId: brandOwner.id, bio: "Brand seed account for merchant dashboard.", phone: "0900000002" }
    }),
    prisma.profile.upsert({
      where: { accountId: creator.id },
      update: { bio: "Creator seed account for campaign and mission flows.", phone: "0900000003" },
      create: { accountId: creator.id, bio: "Creator seed account for campaign and mission flows.", phone: "0900000003" }
    })
  ]);

  const creatorProfile = await prisma.creatorProfile.upsert({
    where: { accountId: creator.id },
    update: {
      displayName: "Creator Sạch",
      mainPlatform: SocialPlatform.TIKTOK,
      socialUrl: "https://www.tiktok.com/@dcreator.seed",
      handle: "dcreator.seed",
      followerCount: 25000,
      contentCategory: "Lifestyle",
      location: "Ho Chi Minh City",
      isSuspended: false
    },
    create: {
      accountId: creator.id,
      displayName: "Creator Sạch",
      mainPlatform: SocialPlatform.TIKTOK,
      socialUrl: "https://www.tiktok.com/@dcreator.seed",
      handle: "dcreator.seed",
      followerCount: 25000,
      contentCategory: "Lifestyle",
      location: "Ho Chi Minh City"
    }
  });

  await prisma.creatorSocialLink.upsert({
    where: {
      creatorProfileId_platform_socialUrl: {
        creatorProfileId: creatorProfile.id,
        platform: SocialPlatform.TIKTOK,
        socialUrl: "https://www.tiktok.com/@dcreator.seed"
      }
    },
    update: {
      handle: "dcreator.seed",
      followers: 25000,
      isActive: true,
      verificationStatus: CreatorChannelVerificationStatus.VERIFIED,
      status: CreatorSocialLinkStatus.APPROVED,
      reviewedById: admin.id,
      reviewedAt: new Date()
    },
    create: {
      creatorProfileId: creatorProfile.id,
      platform: SocialPlatform.TIKTOK,
      handle: "dcreator.seed",
      socialUrl: "https://www.tiktok.com/@dcreator.seed",
      followers: 25000,
      isActive: true,
      verificationStatus: CreatorChannelVerificationStatus.VERIFIED,
      status: CreatorSocialLinkStatus.APPROVED,
      reviewedById: admin.id,
      reviewedAt: new Date()
    }
  });

  const brand = await prisma.brand.upsert({
    where: { id: "seed-brand-dcreator" },
    update: {
      ownerAccountId: brandOwner.id,
      name: "NONE Clean Brand",
      contactName: "Brand Manager",
      contactPhone: "0900000002",
      contactEmail: "brand@dcreator.vn",
      status: BrandStatus.ACTIVE,
      isLocked: false,
      reviewedById: admin.id,
      reviewedAt: new Date()
    },
    create: {
      id: "seed-brand-dcreator",
      ownerAccountId: brandOwner.id,
      name: "NONE Clean Brand",
      legalName: "NONE Clean Brand",
      industry: "FMCG",
      website: "https://dcreator.vn",
      address: "Ho Chi Minh City, Vietnam",
      contactName: "Brand Manager",
      contactPhone: "0900000002",
      contactEmail: "brand@dcreator.vn",
      description: "Brand seed sạch cho deploy.",
      productCategories: "Food, Lifestyle",
      inventoryDescription: "Inventory seed sạch cho campaign đầu tiên.",
      revenueSharePercent: 10,
      commissionRatePercent: 12,
      legalResponsibilityAccepted: true,
      status: BrandStatus.ACTIVE,
      reviewedById: admin.id,
      reviewedAt: new Date()
    }
  });

  await prisma.brandMember.upsert({
    where: { brandId_accountId: { brandId: brand.id, accountId: brandOwner.id } },
    update: { role: BrandMemberRole.OWNER, status: BrandMemberStatus.ACTIVE },
    create: { brandId: brand.id, accountId: brandOwner.id, role: BrandMemberRole.OWNER, status: BrandMemberStatus.ACTIVE }
  });

  await prisma.brandSubscription.upsert({
    where: { brandId: brand.id },
    update: { packageCode: BrandSubscriptionPackageCode.FREE, activatedAt: new Date() },
    create: { brandId: brand.id, packageCode: BrandSubscriptionPackageCode.FREE, activatedAt: new Date() }
  });

  await Promise.all([
    ensureWallet(admin.id, 0),
    ensureWallet(brandOwner.id, 1_000_000),
    ensureWallet(creator.id, 100_000),
    ensureWallet(user.id, 500_000)
  ]);

  console.log("Seed deploy accounts ready:");
  console.log("- ADMIN/OPS: admin@dcreator.vn");
  console.log("- BRAND: brand@dcreator.vn");
  console.log("- CREATOR: creator@dcreator.vn");
  console.log("- USER: user@dcreator.vn");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
