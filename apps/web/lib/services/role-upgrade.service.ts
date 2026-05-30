import { BrandMemberRole, BrandStatus, NotificationEvent, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { APPLICATION_STATUS } from "@/lib/constants/enums";
import { AppError } from "@/lib/errors";
import { hasSomeRole } from "@/lib/auth/roles";
import { resolvePrimaryRole } from "@/lib/auth/role-constants";
import { writeAuditLog } from "@/lib/services/audit-log.service";
import { createNotification } from "@/lib/services/notification.service";
import type { BrandApplicationInput, CreatorApplicationInput } from "@/lib/validators/role-upgrade";
type ApplicationStatusValue = (typeof APPLICATION_STATUS)[number];

function normalizeOptional(value?: string) {
  if (!value) return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

function ensureCanEdit(status: ApplicationStatusValue) {
  if (status === "PENDING_REVIEW" || status === "APPROVED") {
    throw new AppError("Application is not editable", 409, "APPLICATION_NOT_EDITABLE");
  }
}

function resolveContractSignedAt() {
  return null;
}

async function assignRole(tx: Prisma.TransactionClient, accountId: string, role: Role) {
  await tx.accountRole.upsert({
    where: { accountId_role: { accountId, role } },
    create: { accountId, role },
    update: {}
  });
}

async function syncCreatorAccessFromApplication(tx: Prisma.TransactionClient, app: {
  id: string;
  accountId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  mainPlatform: "TIKTOK" | "INSTAGRAM" | "YOUTUBE" | "FACEBOOK" | "SHOPEE" | "OTHER";
  socialUrl: string;
  handle: string | null;
  followerCount: number | null;
  contentCategory: string | null;
  portfolioUrl: string | null;
  location: string | null;
  expectedRate: number | null;
  maxJobsPerMonth: number | null;
  realName: string | null;
  phone: string | null;
  identityNumber: string | null;
  identityFrontUrl: string | null;
  identityBackUrl: string | null;
  selfieUrl: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  taxCode: string | null;
}) {
  const profile = await tx.creatorProfile.upsert({
    where: { accountId: app.accountId },
    create: {
      accountId: app.accountId,
      displayName: app.displayName,
      avatarUrl: app.avatarUrl,
      bio: app.bio,
      mainPlatform: app.mainPlatform,
      socialUrl: app.socialUrl,
      handle: app.handle,
      followerCount: app.followerCount,
      contentCategory: app.contentCategory,
      portfolioUrl: app.portfolioUrl,
      location: app.location,
      expectedRate: app.expectedRate,
      maxJobsPerMonth: app.maxJobsPerMonth,
      realName: app.realName,
      phone: app.phone,
      identityNumber: app.identityNumber,
      identityFrontUrl: app.identityFrontUrl,
      identityBackUrl: app.identityBackUrl,
      selfieUrl: app.selfieUrl,
      bankAccountName: app.bankAccountName,
      bankAccountNumber: app.bankAccountNumber,
      bankName: app.bankName,
      taxCode: app.taxCode
    },
    update: {
      displayName: app.displayName,
      avatarUrl: app.avatarUrl,
      bio: app.bio,
      mainPlatform: app.mainPlatform,
      socialUrl: app.socialUrl,
      handle: app.handle,
      followerCount: app.followerCount,
      contentCategory: app.contentCategory,
      portfolioUrl: app.portfolioUrl,
      location: app.location,
      expectedRate: app.expectedRate,
      maxJobsPerMonth: app.maxJobsPerMonth,
      realName: app.realName,
      phone: app.phone,
      identityNumber: app.identityNumber,
      identityFrontUrl: app.identityFrontUrl,
      identityBackUrl: app.identityBackUrl,
      selfieUrl: app.selfieUrl,
      bankAccountName: app.bankAccountName,
      bankAccountNumber: app.bankAccountNumber,
      bankName: app.bankName,
      taxCode: app.taxCode
    }
  });

  await tx.creatorSocialLink.upsert({
    where: {
      creatorProfileId_platform_socialUrl: {
        creatorProfileId: profile.id,
        platform: app.mainPlatform,
        socialUrl: app.socialUrl
      }
    },
    create: {
      creatorProfileId: profile.id,
      platform: app.mainPlatform,
      socialUrl: app.socialUrl,
      followers: app.followerCount ?? 0,
      status: "APPROVED",
      reviewedAt: new Date()
    },
    update: {
      followers: app.followerCount ?? 0,
      status: "APPROVED",
      rejectReason: null,
      reviewedAt: new Date()
    }
  });

  await assignRole(tx, app.accountId, Role.CREATOR);
  await tx.account.update({ where: { id: app.accountId }, data: { role: Role.CREATOR } });
}

async function syncBrandAccessFromApplication(
  tx: Prisma.TransactionClient,
  app: Prisma.BrandApplicationGetPayload<{}>
) {
  const existingBrand = await tx.brand.findFirst({
    where: { ownerAccountId: app.accountId },
    orderBy: { createdAt: "desc" }
  });
  const reviewedAt = new Date();
  const brand = existingBrand
    ? await tx.brand.update({
        where: { id: existingBrand.id },
        data: {
          name: app.brandName,
          logoUrl: app.logoUrl,
          legalName: app.legalName,
          industry: app.industry,
          website: app.website,
          fanpage: app.fanpage,
          address: app.address,
          contactName: app.contactName,
          contactPhone: app.contactPhone,
          contactEmail: app.contactEmail,
          description: app.description,
          businessGoal: app.businessGoal,
          taxCode: app.taxCode,
          businessLicenseUrl: app.businessLicenseUrl,
          representativeName: app.representativeName,
          representativePhone: app.representativePhone,
          representativeEmail: app.representativeEmail,
          productCategories: app.productCategories,
          inventoryDescription: app.inventoryDescription,
          revenueSharePercent: app.revenueSharePercent,
          commissionRatePercent: app.commissionRatePercent,
          bccAgreementVersion: app.bccAgreementVersion,
          bccAgreementTerms: app.bccAgreementTerms,
          legalResponsibilityAccepted: app.legalResponsibilityAccepted,
          contractFileUrl: app.contractFileUrl,
          contractSignedAt: app.contractSignedAt,
          status: BrandStatus.ACTIVE,
          reviewedById: null,
          reviewedAt
        }
      })
    : await tx.brand.create({
        data: {
          ownerAccountId: app.accountId,
          name: app.brandName,
          logoUrl: app.logoUrl,
          legalName: app.legalName,
          industry: app.industry,
          website: app.website,
          fanpage: app.fanpage,
          address: app.address,
          contactName: app.contactName,
          contactPhone: app.contactPhone,
          contactEmail: app.contactEmail,
          description: app.description,
          businessGoal: app.businessGoal,
          taxCode: app.taxCode,
          businessLicenseUrl: app.businessLicenseUrl,
          representativeName: app.representativeName,
          representativePhone: app.representativePhone,
          representativeEmail: app.representativeEmail,
          productCategories: app.productCategories,
          inventoryDescription: app.inventoryDescription,
          revenueSharePercent: app.revenueSharePercent,
          commissionRatePercent: app.commissionRatePercent,
          bccAgreementVersion: app.bccAgreementVersion,
          bccAgreementTerms: app.bccAgreementTerms,
          legalResponsibilityAccepted: app.legalResponsibilityAccepted,
          contractFileUrl: app.contractFileUrl,
          contractSignedAt: app.contractSignedAt,
          status: BrandStatus.ACTIVE,
          reviewedById: null,
          reviewedAt
        }
      });
  await tx.brandMember.upsert({
    where: { brandId_accountId: { brandId: brand.id, accountId: app.accountId } },
    create: { brandId: brand.id, accountId: app.accountId, role: BrandMemberRole.OWNER },
    update: { role: BrandMemberRole.OWNER }
  });
  await assignRole(tx, app.accountId, Role.BRAND_OWNER);
  await tx.account.update({ where: { id: app.accountId }, data: { role: Role.BRAND_OWNER } });
  return brand;
}

export async function getRoleUpgradeSnapshot(accountId: string) {
  const [account, creatorLatest, brandLatest] = await Promise.all([
    prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        profile: { select: { phone: true } },
        roleAssignments: { select: { role: true } }
      }
    }),
    prisma.creatorApplication.findFirst({ where: { accountId }, orderBy: { createdAt: "desc" } }),
    prisma.brandApplication.findFirst({ where: { accountId }, orderBy: { createdAt: "desc" } })
  ]);

  const roles = Array.from(new Set(account.roleAssignments.map((x) => x.role)));
  const primaryRole = resolvePrimaryRole(roles);
  return { account: { ...account, role: primaryRole, roles }, creatorApplication: creatorLatest, brandApplication: brandLatest };
}

export async function applyCreator(accountId: string, input: CreatorApplicationInput) {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId }, select: { roleAssignments: { select: { role: true } } } });
  const roles = account.roleAssignments.map((item) => item.role);
  if (hasSomeRole(Role.CREATOR, roles) || hasSomeRole(Role.ADMIN, roles) || hasSomeRole(Role.OPS, roles)) {
    throw new AppError("Account already has creator access", 409, "CREATOR_ALREADY_GRANTED");
  }

  const pending = await prisma.creatorApplication.findFirst({
    where: { accountId, status: { in: ["PENDING_REVIEW", "APPROVED"] } },
    select: { id: true }
  });
  if (pending) throw new AppError("Creator profile is already active", 409, "CREATOR_ALREADY_GRANTED");

  const created = await prisma.$transaction(async (tx) => {
    const app = await tx.creatorApplication.create({
      data: {
        accountId,
        status: "APPROVED",
        displayName: input.displayName,
        avatarUrl: normalizeOptional(input.avatarUrl),
        bio: normalizeOptional(input.bio),
        mainPlatform: input.mainPlatform,
        socialUrl: input.socialUrl,
        handle: normalizeOptional(input.handle),
        followerCount: input.followerCount,
        contentCategory: normalizeOptional(input.contentCategory),
        portfolioUrl: normalizeOptional(input.portfolioUrl),
        location: normalizeOptional(input.location),
        expectedRate: input.expectedRate,
        maxJobsPerMonth: input.maxJobsPerMonth,
        realName: normalizeOptional(input.realName),
        phone: normalizeOptional(input.phone),
        identityNumber: normalizeOptional(input.identityNumber),
        identityFrontUrl: normalizeOptional(input.identityFrontUrl),
        identityBackUrl: normalizeOptional(input.identityBackUrl),
        selfieUrl: normalizeOptional(input.selfieUrl),
        bankAccountName: normalizeOptional(input.bankAccountName),
        bankAccountNumber: normalizeOptional(input.bankAccountNumber),
        bankName: normalizeOptional(input.bankName),
        taxCode: normalizeOptional(input.taxCode),
        reviewedAt: new Date()
      }
    });
    await syncCreatorAccessFromApplication(tx, app);
    return app;
  });
  await writeAuditLog({
    actorId: accountId,
    action: "CREATOR_APPLICATION_AUTO_APPROVED",
    targetType: "CreatorApplication",
    targetId: created.id,
    newStatus: created.status
  });
  await createNotification({
    accountId,
    event: NotificationEvent.CREATOR_APPLICATION_APPROVED,
    title: "Hồ sơ Creator đã được tạo",
    content: "Bạn có thể bắt đầu thiết lập Creator Dashboard. Bổ sung xác minh để mở khóa payout nâng cao.",
    metadata: { creatorApplicationId: created.id }
  });
  return created;
}

export async function getMyCreatorApplication(accountId: string) {
  const [latest, creatorProfile] = await Promise.all([
    prisma.creatorApplication.findFirst({
      where: { accountId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.creatorProfile.findUnique({
      where: { accountId },
      select: {
        id: true,
        displayName: true,
        mainPlatform: true,
        socialUrl: true,
        followerCount: true,
        contentCategory: true,
        portfolioUrl: true
      }
    })
  ]);

  return {
    status: latest?.status ?? "DRAFT",
    application: latest,
    creatorProfile
  };
}

export async function updateCreatorApplication(accountId: string, applicationId: string, input: CreatorApplicationInput) {
  const current = await prisma.creatorApplication.findUnique({ where: { id: applicationId } });
  if (!current || current.accountId !== accountId) throw new AppError("Application not found", 404, "APPLICATION_NOT_FOUND");
  ensureCanEdit(current.status);

  const updated = await prisma.$transaction(async (tx) => {
    const app = await tx.creatorApplication.update({
      where: { id: applicationId },
      data: {
        status: "APPROVED",
        rejectReason: null,
        reviewNote: null,
        reviewedById: null,
        displayName: input.displayName,
        avatarUrl: normalizeOptional(input.avatarUrl),
        bio: normalizeOptional(input.bio),
        mainPlatform: input.mainPlatform,
        socialUrl: input.socialUrl,
        handle: normalizeOptional(input.handle),
        followerCount: input.followerCount,
        contentCategory: normalizeOptional(input.contentCategory),
        portfolioUrl: normalizeOptional(input.portfolioUrl),
        location: normalizeOptional(input.location),
        expectedRate: input.expectedRate,
        maxJobsPerMonth: input.maxJobsPerMonth,
        realName: normalizeOptional(input.realName),
        phone: normalizeOptional(input.phone),
        identityNumber: normalizeOptional(input.identityNumber),
        identityFrontUrl: normalizeOptional(input.identityFrontUrl),
        identityBackUrl: normalizeOptional(input.identityBackUrl),
        selfieUrl: normalizeOptional(input.selfieUrl),
        bankAccountName: normalizeOptional(input.bankAccountName),
        bankAccountNumber: normalizeOptional(input.bankAccountNumber),
        bankName: normalizeOptional(input.bankName),
        taxCode: normalizeOptional(input.taxCode),
        reviewedAt: new Date()
      }
    });
    await syncCreatorAccessFromApplication(tx, app);
    return app;
  });
  await writeAuditLog({
    actorId: accountId,
    action: "CREATOR_APPLICATION_UPDATED",
    targetType: "CreatorApplication",
    targetId: updated.id,
    newStatus: updated.status
  });
  await createNotification({
    accountId,
    event: NotificationEvent.CREATOR_APPLICATION_APPROVED,
    title: "Hồ sơ Creator đã được cập nhật",
    content: "Bạn có thể tiếp tục sử dụng Creator Dashboard.",
    metadata: { creatorApplicationId: updated.id }
  });
  return updated;
}

export async function applyBrand(accountId: string, input: BrandApplicationInput) {
  const pending = await prisma.brandApplication.findFirst({
    where: { accountId, status: { in: ["PENDING_REVIEW", "APPROVED"] } },
    select: { id: true }
  });
  if (pending) throw new AppError("Brand profile is already active", 409, "BRAND_ALREADY_GRANTED");

  return prisma.$transaction(async (tx) => {
    const app = await tx.brandApplication.create({
      data: {
        accountId,
        status: "APPROVED",
        brandName: input.brandName,
        logoUrl: normalizeOptional(input.logoUrl),
        legalName: normalizeOptional(input.legalName),
        industry: normalizeOptional(input.industry),
        website: normalizeOptional(input.website),
        fanpage: normalizeOptional(input.fanpage),
        address: normalizeOptional(input.address),
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        description: normalizeOptional(input.description),
        businessGoal: normalizeOptional(input.businessGoal),
        taxCode: normalizeOptional(input.taxCode),
        businessLicenseUrl: normalizeOptional(input.businessLicenseUrl),
        representativeName: normalizeOptional(input.representativeName),
        representativePhone: normalizeOptional(input.representativePhone),
        representativeEmail: normalizeOptional(input.representativeEmail),
        representativeIdentityNumber: normalizeOptional(input.representativeIdentityNumber),
        bankAccountName: normalizeOptional(input.bankAccountName),
        bankAccountNumber: normalizeOptional(input.bankAccountNumber),
        bankName: normalizeOptional(input.bankName),
        productCategories: normalizeOptional(input.productCategories),
        inventoryDescription: normalizeOptional(input.inventoryDescription),
        expectedCampaignBudget: input.expectedCampaignBudget,
        expectedCreatorCount: input.expectedCreatorCount,
        revenueSharePercent: input.revenueSharePercent,
        commissionRatePercent: input.commissionRatePercent,
        bccAgreementAccepted: input.bccAgreementAccepted ?? false,
        bccAgreementVersion: normalizeOptional(input.bccAgreementVersion),
        legalResponsibilityAccepted: input.legalResponsibilityAccepted ?? false,
        contractFileUrl: normalizeOptional(input.contractFileUrl),
        contractSignedAt: resolveContractSignedAt(),
        reviewedAt: new Date()
      }
    });
    const brand = await syncBrandAccessFromApplication(tx, app);
    return { application: app, brand: { id: brand.id, name: brand.name, status: brand.status } };
  });
}

export async function updateBrandApplication(accountId: string, applicationId: string, input: BrandApplicationInput) {
  const current = await prisma.brandApplication.findUnique({ where: { id: applicationId } });
  if (!current || current.accountId !== accountId) throw new AppError("Application not found", 404, "APPLICATION_NOT_FOUND");
  ensureCanEdit(current.status);

  return prisma.$transaction(async (tx) => {
    const app = await tx.brandApplication.update({
      where: { id: applicationId },
      data: {
        status: "APPROVED",
        rejectReason: null,
        reviewNote: null,
        reviewedById: null,
        brandName: input.brandName,
        logoUrl: normalizeOptional(input.logoUrl),
        legalName: normalizeOptional(input.legalName),
        industry: normalizeOptional(input.industry),
        website: normalizeOptional(input.website),
        fanpage: normalizeOptional(input.fanpage),
        address: normalizeOptional(input.address),
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        description: normalizeOptional(input.description),
        businessGoal: normalizeOptional(input.businessGoal),
        taxCode: normalizeOptional(input.taxCode),
        businessLicenseUrl: normalizeOptional(input.businessLicenseUrl),
        representativeName: normalizeOptional(input.representativeName),
        representativePhone: normalizeOptional(input.representativePhone),
        representativeEmail: normalizeOptional(input.representativeEmail),
        representativeIdentityNumber: normalizeOptional(input.representativeIdentityNumber),
        bankAccountName: normalizeOptional(input.bankAccountName),
        bankAccountNumber: normalizeOptional(input.bankAccountNumber),
        bankName: normalizeOptional(input.bankName),
        productCategories: normalizeOptional(input.productCategories),
        inventoryDescription: normalizeOptional(input.inventoryDescription),
        expectedCampaignBudget: input.expectedCampaignBudget,
        expectedCreatorCount: input.expectedCreatorCount,
        revenueSharePercent: input.revenueSharePercent,
        commissionRatePercent: input.commissionRatePercent,
        bccAgreementAccepted: input.bccAgreementAccepted ?? false,
        bccAgreementVersion: normalizeOptional(input.bccAgreementVersion),
        legalResponsibilityAccepted: input.legalResponsibilityAccepted ?? false,
        contractFileUrl: normalizeOptional(input.contractFileUrl),
        contractSignedAt: resolveContractSignedAt(),
        reviewedAt: new Date()
      }
    });
    await syncBrandAccessFromApplication(tx, app);
    return app;
  });
}

type ListCreatorApplicationsOptions = {
  status?: ApplicationStatusValue;
  query?: string;
  platform?: "TIKTOK" | "INSTAGRAM" | "YOUTUBE" | "FACEBOOK" | "SHOPEE" | "OTHER";
  contentCategory?: string;
  sort?: "newest" | "oldest";
};

type ListBrandApplicationsOptions = {
  status?: ApplicationStatusValue;
  query?: string;
  industry?: string;
  sort?: "newest" | "oldest";
};

export async function listCreatorApplications(options: ListCreatorApplicationsOptions = {}) {
  const { status, query, platform, contentCategory, sort = "newest" } = options;
  return prisma.creatorApplication.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(platform ? { mainPlatform: platform } : {}),
      ...(contentCategory ? { contentCategory: { contains: contentCategory, mode: "insensitive" } } : {}),
      ...(query
        ? {
            OR: [
              { displayName: { contains: query, mode: "insensitive" } },
              { socialUrl: { contains: query, mode: "insensitive" } },
              { account: { email: { contains: query, mode: "insensitive" } } },
              { account: { displayName: { contains: query, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    include: {
      account: {
        select: {
          id: true,
          email: true,
          displayName: true,
          profile: { select: { phone: true } }
        }
      },
      reviewedBy: { select: { id: true, displayName: true, email: true } }
    },
    orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" }
  });
}

export async function listBrandApplications(options: ListBrandApplicationsOptions = {}) {
  const { status, query, industry, sort = "newest" } = options;
  return prisma.brandApplication.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(industry ? { industry: { contains: industry, mode: "insensitive" } } : {}),
      ...(query
        ? {
            OR: [
              { brandName: { contains: query, mode: "insensitive" } },
              { industry: { contains: query, mode: "insensitive" } },
              { contactEmail: { contains: query, mode: "insensitive" } },
              { taxCode: { contains: query, mode: "insensitive" } },
              { account: { email: { contains: query, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    include: {
      account: {
        select: {
          id: true,
          email: true,
          displayName: true,
          profile: { select: { phone: true } }
        }
      },
      reviewedBy: { select: { id: true, displayName: true, email: true } }
    },
    orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" }
  });
}

export async function getCreatorApplicationDetail(applicationId: string) {
  const [application, statusHistory] = await Promise.all([
    prisma.creatorApplication.findUnique({
      where: { id: applicationId },
      include: {
      account: {
        select: {
          id: true,
          email: true,
          displayName: true,
          profile: { select: { phone: true } },
          creatorProfile: {
            select: {
              id: true,
              mainPlatform: true,
              socialUrl: true,
              handle: true,
              followerCount: true,
              contentCategory: true
            }
          }
        }
      },
      reviewedBy: { select: { id: true, email: true, displayName: true } }
    }
  }),
    prisma.auditLog.findMany({
      where: { targetType: "CreatorApplication", targetId: applicationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        oldStatus: true,
        newStatus: true,
        reason: true,
        createdAt: true,
        actor: { select: { id: true, displayName: true, email: true } }
      }
    })
  ]);
  if (!application) throw new AppError("Application not found", 404, "APPLICATION_NOT_FOUND");
  return { ...application, statusHistory };
}

export async function getBrandApplicationDetail(applicationId: string) {
  const [application, statusHistory] = await Promise.all([
    prisma.brandApplication.findUnique({
    where: { id: applicationId },
    include: {
      account: { select: { id: true, email: true, displayName: true, profile: { select: { phone: true } } } },
      reviewedBy: { select: { id: true, displayName: true, email: true } }
    }
  }),
    prisma.auditLog.findMany({
      where: { targetType: "BrandApplication", targetId: applicationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        oldStatus: true,
        newStatus: true,
        reason: true,
        createdAt: true,
        actor: { select: { id: true, displayName: true, email: true } }
      }
    })
  ]);
  if (!application) throw new AppError("Application not found", 404, "APPLICATION_NOT_FOUND");
  return { ...application, statusHistory };
}

export async function reviewCreatorApplication(actorId: string, applicationId: string, status: ApplicationStatusValue, rejectReason?: string, reviewNote?: string) {
  const current = await prisma.creatorApplication.findUnique({ where: { id: applicationId } });
  if (!current) throw new AppError("Application not found", 404, "APPLICATION_NOT_FOUND");
  if (current.status !== "PENDING_REVIEW") throw new AppError("Application already processed", 409, "APPLICATION_PROCESSED");
  const decisionAction = status === "APPROVED" ? "VERIFY" : status === "REJECTED" ? "RISK" : status === "NEEDS_REVISION" ? "RESTRICT" : status;

  const updated = await prisma.$transaction(async (tx) => {
    const app = await tx.creatorApplication.update({
      where: { id: applicationId },
      data: { status, rejectReason: rejectReason ?? null, reviewNote: reviewNote ?? null, reviewedById: actorId, reviewedAt: new Date() }
    });

    if (status === "APPROVED") {
      const profile = await tx.creatorProfile.upsert({
        where: { accountId: app.accountId },
        create: {
          accountId: app.accountId,
          displayName: app.displayName,
          avatarUrl: app.avatarUrl,
          bio: app.bio,
          mainPlatform: app.mainPlatform,
          socialUrl: app.socialUrl,
          handle: app.handle,
          followerCount: app.followerCount,
          contentCategory: app.contentCategory,
          portfolioUrl: app.portfolioUrl,
          location: app.location,
          expectedRate: app.expectedRate,
          maxJobsPerMonth: app.maxJobsPerMonth,
          realName: app.realName,
          phone: app.phone,
          identityNumber: app.identityNumber,
          identityFrontUrl: app.identityFrontUrl,
          identityBackUrl: app.identityBackUrl,
          selfieUrl: app.selfieUrl,
          bankAccountName: app.bankAccountName,
          bankAccountNumber: app.bankAccountNumber,
          bankName: app.bankName,
          taxCode: app.taxCode
        },
        update: {
          displayName: app.displayName,
          avatarUrl: app.avatarUrl,
          bio: app.bio,
          mainPlatform: app.mainPlatform,
          socialUrl: app.socialUrl,
          handle: app.handle,
          followerCount: app.followerCount,
          contentCategory: app.contentCategory,
          portfolioUrl: app.portfolioUrl,
          location: app.location,
          expectedRate: app.expectedRate,
          maxJobsPerMonth: app.maxJobsPerMonth
        }
      });

      await tx.creatorSocialLink.upsert({
        where: {
          creatorProfileId_platform_socialUrl: {
            creatorProfileId: profile.id,
            platform: app.mainPlatform,
            socialUrl: app.socialUrl
          }
        },
        create: {
          creatorProfileId: profile.id,
          platform: app.mainPlatform,
          socialUrl: app.socialUrl,
          followers: app.followerCount ?? 0,
          status: "APPROVED",
          reviewedById: actorId,
          reviewedAt: new Date()
        },
        update: {
          followers: app.followerCount ?? 0,
          status: "APPROVED",
          rejectReason: null,
          reviewedById: actorId,
          reviewedAt: new Date()
        }
      });

      await assignRole(tx, app.accountId, Role.CREATOR);
      await tx.account.update({ where: { id: app.accountId }, data: { role: Role.CREATOR } });
    }
    return app;
  });

  await writeAuditLog({
    actorId,
    action: `CREATOR_APPLICATION_${decisionAction}`,
    targetType: "CreatorApplication",
    targetId: updated.id,
    oldStatus: current.status,
    newStatus: status,
    reason: rejectReason ?? null,
    metadata: { rejectReason: rejectReason ?? null, reviewNote: reviewNote ?? null }
  });
  await createNotification({
    accountId: updated.accountId,
    event: status === "APPROVED" ? NotificationEvent.CREATOR_APPLICATION_APPROVED : NotificationEvent.CAMPAIGN_REJECTED,
    title: status === "APPROVED" ? "Creator application approved" : "Creator application updated",
    content: status === "APPROVED" ? "Yêu cầu Creator của bạn đã được duyệt." : `Yêu cầu Creator: ${status}`,
    metadata: { status, rejectReason: rejectReason ?? null, reviewNote: reviewNote ?? null }
  });
  return updated;
}

export async function reviewBrandApplication(actorId: string, applicationId: string, status: ApplicationStatusValue, rejectReason?: string, reviewNote?: string) {
  const current = await prisma.brandApplication.findUnique({ where: { id: applicationId } });
  if (!current) throw new AppError("Application not found", 404, "APPLICATION_NOT_FOUND");
  if (current.status !== "PENDING_REVIEW") throw new AppError("Application already processed", 409, "APPLICATION_PROCESSED");
  const decisionAction = status === "APPROVED" ? "VERIFY" : status === "REJECTED" ? "RISK" : status === "NEEDS_REVISION" ? "RESTRICT" : status;
  const isOnboardingBccUpdate = current.reviewNote === "Brand requested onboarding/BCC update and admin review.";
  const reviewedAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const app = await tx.brandApplication.update({
      where: { id: applicationId },
      data: { status, rejectReason: rejectReason ?? null, reviewNote: reviewNote ?? current.reviewNote, reviewedById: actorId, reviewedAt }
    });

    if (status === "APPROVED") {
      const existingBrand = await tx.brand.findFirst({
        where: { ownerAccountId: app.accountId },
        orderBy: { createdAt: "desc" }
      });
      const brand = existingBrand
        ? await tx.brand.update({
            where: { id: existingBrand.id },
            data: {
              name: app.brandName,
              logoUrl: app.logoUrl,
              legalName: app.legalName,
              industry: app.industry,
              website: app.website,
              fanpage: app.fanpage,
              address: app.address,
              contactName: app.contactName,
              contactPhone: app.contactPhone,
              contactEmail: app.contactEmail,
              description: app.description,
              businessGoal: app.businessGoal,
              taxCode: app.taxCode,
              businessLicenseUrl: app.businessLicenseUrl,
              representativeName: app.representativeName,
              representativePhone: app.representativePhone,
              representativeEmail: app.representativeEmail,
              productCategories: app.productCategories,
              inventoryDescription: app.inventoryDescription,
              revenueSharePercent: app.revenueSharePercent,
              commissionRatePercent: app.commissionRatePercent,
              bccAgreementVersion: app.bccAgreementVersion,
              bccAgreementTerms: app.bccAgreementTerms,
              legalResponsibilityAccepted: isOnboardingBccUpdate ? false : app.legalResponsibilityAccepted,
              contractFileUrl: app.contractFileUrl,
              contractSignedAt: isOnboardingBccUpdate ? null : app.contractSignedAt,
              status: BrandStatus.ACTIVE,
              reviewedById: actorId,
              reviewedAt
            }
          })
        : await tx.brand.create({
            data: {
              ownerAccountId: app.accountId,
              name: app.brandName,
              logoUrl: app.logoUrl,
              legalName: app.legalName,
              industry: app.industry,
              website: app.website,
              fanpage: app.fanpage,
              address: app.address,
              contactName: app.contactName,
              contactPhone: app.contactPhone,
              contactEmail: app.contactEmail,
              description: app.description,
              businessGoal: app.businessGoal,
              taxCode: app.taxCode,
              businessLicenseUrl: app.businessLicenseUrl,
              representativeName: app.representativeName,
              representativePhone: app.representativePhone,
              representativeEmail: app.representativeEmail,
              productCategories: app.productCategories,
              inventoryDescription: app.inventoryDescription,
              revenueSharePercent: app.revenueSharePercent,
              commissionRatePercent: app.commissionRatePercent,
              bccAgreementVersion: app.bccAgreementVersion,
              bccAgreementTerms: app.bccAgreementTerms,
              legalResponsibilityAccepted: isOnboardingBccUpdate ? false : app.legalResponsibilityAccepted,
              contractFileUrl: app.contractFileUrl,
              contractSignedAt: isOnboardingBccUpdate ? null : app.contractSignedAt,
              status: BrandStatus.ACTIVE,
              reviewedById: actorId,
              reviewedAt
            }
          });
      await tx.brandMember.upsert({
        where: { brandId_accountId: { brandId: brand.id, accountId: app.accountId } },
        create: { brandId: brand.id, accountId: app.accountId, role: BrandMemberRole.OWNER },
        update: { role: BrandMemberRole.OWNER }
      });
      await assignRole(tx, app.accountId, Role.BRAND_OWNER);
      await tx.account.update({ where: { id: app.accountId }, data: { role: Role.BRAND_OWNER } });
    }
    return app;
  });

  await writeAuditLog({
    actorId,
    action: `BRAND_APPLICATION_${decisionAction}`,
    targetType: "BrandApplication",
    targetId: updated.id,
    oldStatus: current.status,
    newStatus: status,
    reason: rejectReason ?? null,
    metadata: { rejectReason: rejectReason ?? null, reviewNote: reviewNote ?? null }
  });
  await createNotification({
    accountId: updated.accountId,
    event: status === "APPROVED" ? NotificationEvent.BRAND_APPLICATION_APPROVED : NotificationEvent.CAMPAIGN_REJECTED,
    title: status === "APPROVED" ? "Brand application approved" : "Brand application updated",
    content: status === "APPROVED" ? "Yêu cầu Brand của bạn đã được duyệt." : `Yêu cầu Brand: ${status}`,
    metadata: { status, rejectReason: rejectReason ?? null, reviewNote: reviewNote ?? null }
  });
  return updated;
}
