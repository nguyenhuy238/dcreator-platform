/* global process */

import { PrismaClient, CampaignCategory, CampaignStatus, CampaignType, MissionStatus, RewardType, Role, RoleRequestStatus, RoleRequestType } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

const QA_ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL ?? "qa.admin@dcreator.local";
const QA_ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD ?? "Test@123456";
const QA_CREATOR_EMAIL = process.env.QA_CREATOR_EMAIL ?? "qa.creator@dcreator.local";
const QA_BRAND_EMAIL = process.env.QA_BRAND_EMAIL ?? "qa.brand@dcreator.local";
const QA_USER_EMAIL = process.env.QA_USER_EMAIL ?? "qa.user@dcreator.local";
const QA_DEFAULT_PASSWORD = process.env.QA_DEFAULT_PASSWORD ?? "Test@123456";
const QA_SCENARIO_SLUG = process.env.QA_SCENARIO_SLUG ?? "qa-e2e-campaign";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function upsertAccount(email, displayName, role, password) {
  return prisma.account.upsert({
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
}

async function ensureAccountRole(accountId, role) {
  await prisma.accountRole.upsert({
    where: { accountId_role: { accountId, role } },
    create: { accountId, role },
    update: {}
  });
}

async function ensureWallet(userId, pointsBalance = 0, cashBalanceVnd = 0) {
  await prisma.wallet.upsert({
    where: { userId },
    update: { pointsBalance, cashBalanceVnd },
    create: { userId, pointsBalance, cashBalanceVnd }
  });
}

async function main() {
  const admin = await upsertAccount(QA_ADMIN_EMAIL, "QA Admin", Role.ADMIN, QA_ADMIN_PASSWORD);
  await ensureAccountRole(admin.id, Role.ADMIN);

  const creatorUser = await upsertAccount(QA_CREATOR_EMAIL, "QA Creator Pending", Role.USER, QA_DEFAULT_PASSWORD);
  await ensureAccountRole(creatorUser.id, Role.USER);

  const brandUser = await upsertAccount(QA_BRAND_EMAIL, "QA Brand Pending", Role.USER, QA_DEFAULT_PASSWORD);
  await ensureAccountRole(brandUser.id, Role.USER);

  const qaUser = await upsertAccount(QA_USER_EMAIL, "QA User", Role.USER, QA_DEFAULT_PASSWORD);
  await ensureAccountRole(qaUser.id, Role.USER);

  await ensureWallet(qaUser.id, 500_000, 0);
  await ensureWallet(creatorUser.id, 100_000, 0);
  await ensureWallet(brandUser.id, 200_000, 0);

  await prisma.roleRequest.upsert({
    where: { id: `qa-role-creator-${creatorUser.id}` },
    update: {
      accountId: creatorUser.id,
      type: RoleRequestType.CREATOR,
      status: RoleRequestStatus.PENDING,
      reviewedAt: null,
      reviewedById: null,
      note: "QA creator request pending admin approval"
    },
    create: {
      id: `qa-role-creator-${creatorUser.id}`,
      accountId: creatorUser.id,
      type: RoleRequestType.CREATOR,
      status: RoleRequestStatus.PENDING,
      note: "QA creator request pending admin approval"
    }
  });

  await prisma.roleRequest.upsert({
    where: { id: `qa-role-brand-${brandUser.id}` },
    update: {
      accountId: brandUser.id,
      type: RoleRequestType.BRAND,
      status: RoleRequestStatus.PENDING,
      reviewedAt: null,
      reviewedById: null,
      brandName: "QA Brand",
      brandWebsite: "https://example.com",
      note: "QA brand request pending admin approval"
    },
    create: {
      id: `qa-role-brand-${brandUser.id}`,
      accountId: brandUser.id,
      type: RoleRequestType.BRAND,
      status: RoleRequestStatus.PENDING,
      brandName: "QA Brand",
      brandWebsite: "https://example.com",
      note: "QA brand request pending admin approval"
    }
  });

  const campaign = await prisma.campaign.upsert({
    where: { slug: QA_SCENARIO_SLUG },
    update: {
      brandId: admin.id,
      creatorId: null,
      title: "QA E2E Campaign",
      brief: "QA deterministic campaign for core flow test",
      campaignType: CampaignType.COMMUNITY,
      category: CampaignCategory.LIFESTYLE,
      targetAmountVnd: 20_000_000,
      fundedAmountVnd: 0,
      budgetVnd: 20_000_000,
      status: CampaignStatus.ACTIVE,
      isPublic: true,
      startsAt: new Date(Date.now() - 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    create: {
      slug: QA_SCENARIO_SLUG,
      brandId: admin.id,
      creatorId: null,
      title: "QA E2E Campaign",
      brief: "QA deterministic campaign for core flow test",
      campaignType: CampaignType.COMMUNITY,
      category: CampaignCategory.LIFESTYLE,
      targetAmountVnd: 20_000_000,
      fundedAmountVnd: 0,
      budgetVnd: 20_000_000,
      status: CampaignStatus.ACTIVE,
      isPublic: true,
      startsAt: new Date(Date.now() - 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  const missionId = `qa-mission-${campaign.id}`;
  await prisma.mission.upsert({
    where: { id: missionId },
    update: {
      campaignId: campaign.id,
      title: "QA Mission Open",
      description: "Mission for QA creator flow",
      rewardPoints: 500,
      status: MissionStatus.OPEN
    },
    create: {
      id: missionId,
      campaignId: campaign.id,
      title: "QA Mission Open",
      description: "Mission for QA creator flow",
      rewardPoints: 500,
      status: MissionStatus.OPEN
    }
  });

  const reward = await prisma.reward.upsert({
    where: { id: `qa-reward-${campaign.id}` },
    update: {
      campaignId: campaign.id,
      title: "QA Reward Voucher",
      description: "Voucher reward for QA",
      rewardType: RewardType.DIGITAL_VOUCHER,
      pointsCost: 1000,
      stockTotal: 50,
      stockRemaining: 50,
      isActive: true
    },
    create: {
      id: `qa-reward-${campaign.id}`,
      campaignId: campaign.id,
      title: "QA Reward Voucher",
      description: "Voucher reward for QA",
      rewardType: RewardType.DIGITAL_VOUCHER,
      pointsCost: 1000,
      stockTotal: 50,
      stockRemaining: 50,
      isActive: true
    }
  });

  console.log("QA scenario ready:");
  console.log(`- admin: ${QA_ADMIN_EMAIL}`);
  console.log(`- creator pending: ${QA_CREATOR_EMAIL}`);
  console.log(`- brand pending: ${QA_BRAND_EMAIL}`);
  console.log(`- user: ${QA_USER_EMAIL}`);
  console.log(`- campaign: ${campaign.slug}`);
  console.log(`- rewardId: ${reward.id}`);
  console.log(`- missionId: ${missionId}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
