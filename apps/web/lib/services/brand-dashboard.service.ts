import { randomUUID } from "node:crypto";
import { ApplicationStatus, Brand, CampaignStatus, MissionAudience, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { approveProof, rejectProof } from "@/lib/services/mission.service";
import { getBrandKpis } from "@/lib/services/analytics.service";
import { ensureCreatorMissionFromApprovedApplication } from "@/lib/services/creator-mission.service";
import { createTopupPayment, ensureWalletByAccountId, getWalletTransactions } from "@/lib/services/wallet.service";
import type { z } from "zod";
import type {
  brandProfileSchema,
  brandOnboardingSchema,
  budgetLockSchema,
  budgetTopupSchema,
  campaignCreateSchema,
  creatorApplicationDecisionSchema,
  productSubmissionSchema,
  productSchema,
  proofReviewDecisionSchema,
  rewardTierSchema
} from "@/lib/validators/brand-dashboard";

type BrandProfileInput = z.infer<typeof brandProfileSchema>;
type BrandOnboardingInput = z.infer<typeof brandOnboardingSchema>;
type ProductInput = z.infer<typeof productSchema>;
type CampaignInput = z.infer<typeof campaignCreateSchema>;
type RewardInput = z.infer<typeof rewardTierSchema>;
type CreatorApplicationDecisionInput = z.infer<typeof creatorApplicationDecisionSchema>;
type ProofReviewDecisionInput = z.infer<typeof proofReviewDecisionSchema>;
type BudgetLockInput = z.infer<typeof budgetLockSchema>;
type BudgetTopupInput = z.infer<typeof budgetTopupSchema>;
type ProductSubmissionInput = z.infer<typeof productSubmissionSchema>;

type BrandMeta = {
  brandProfile: {
    brandName: string;
    logoUrl: string;
    businessInfo: string;
    verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  };
  products: Array<{
    id: string;
    sku: string;
    name: string;
    stockQty: number;
    voucherStock: number;
    campaignEligibility: boolean;
    priceVnd: number;
    pricePoints: number;
  }>;
};

type VerificationStatus = BrandMeta["brandProfile"]["verificationStatus"];

function parseBrandMeta(value: unknown): BrandMeta {
  const fallback: BrandMeta = {
    brandProfile: {
      brandName: "",
      logoUrl: "",
      businessInfo: "",
      verificationStatus: "UNVERIFIED"
    },
    products: []
  };

  if (!value || typeof value !== "object") return fallback;
  const raw = value as Record<string, unknown>;
  const profile = raw.brandProfile;
  const products = raw.products;

  const parsedProfile =
    profile && typeof profile === "object"
      ? {
          brandName: typeof (profile as { brandName?: unknown }).brandName === "string" ? (profile as { brandName: string }).brandName : "",
          logoUrl: typeof (profile as { logoUrl?: unknown }).logoUrl === "string" ? (profile as { logoUrl: string }).logoUrl : "",
          businessInfo: typeof (profile as { businessInfo?: unknown }).businessInfo === "string" ? (profile as { businessInfo: string }).businessInfo : "",
          verificationStatus: ((): VerificationStatus => {
            const status = (profile as { verificationStatus?: unknown }).verificationStatus;
            if (status === "VERIFIED" || status === "PENDING" || status === "REJECTED" || status === "UNVERIFIED") return status;
            return "UNVERIFIED";
          })()
        }
      : fallback.brandProfile;

  const parsedProducts = Array.isArray(products)
    ? products
        .filter((p) => p && typeof p === "object")
        .map((p) => ({
          id: typeof (p as { id?: unknown }).id === "string" ? (p as { id: string }).id : randomUUID(),
          sku: typeof (p as { sku?: unknown }).sku === "string" ? (p as { sku: string }).sku : "",
          name: typeof (p as { name?: unknown }).name === "string" ? (p as { name: string }).name : "",
          stockQty: typeof (p as { stockQty?: unknown }).stockQty === "number" ? (p as { stockQty: number }).stockQty : 0,
          voucherStock: typeof (p as { voucherStock?: unknown }).voucherStock === "number" ? (p as { voucherStock: number }).voucherStock : 0,
          campaignEligibility:
            typeof (p as { campaignEligibility?: unknown }).campaignEligibility === "boolean"
              ? (p as { campaignEligibility: boolean }).campaignEligibility
              : true,
          priceVnd: typeof (p as { priceVnd?: unknown }).priceVnd === "number" ? (p as { priceVnd: number }).priceVnd : 0,
          pricePoints: typeof (p as { pricePoints?: unknown }).pricePoints === "number" ? (p as { pricePoints: number }).pricePoints : 0
        }))
    : [];

  return { brandProfile: parsedProfile, products: parsedProducts };
}

async function getBrandScopedCampaign(campaignId: string, brandId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
  if (campaign.brandId !== brandId) throw new AppError("Forbidden", 403, "BRAND_FORBIDDEN");
  return campaign;
}

export async function getBrandOverview(accountId: string) {
  const wallet = await ensureWalletByAccountId(accountId);
  const [activeCampaigns, campaigns, creatorSetRaw, totalVideosSubmitted, totalSales] = await Promise.all([
    prisma.campaign.count({ where: { brandId: accountId, status: CampaignStatus.ACTIVE } }),
    prisma.campaign.findMany({ where: { brandId: accountId }, select: { id: true, budgetVnd: true } }),
    prisma.missionSubmission.findMany({
      where: { mission: { campaign: { brandId: accountId } } },
      select: { accountId: true }
    }),
    prisma.missionSubmission.count({ where: { mission: { campaign: { brandId: accountId } }, status: "SUBMITTED" } }),
    prisma.contribution.aggregate({ _sum: { amountVnd: true }, where: { campaign: { brandId: accountId }, status: "SUCCESS" } })
  ]);

  return {
    activeCampaigns,
    totalBudget: campaigns.reduce((sum, c) => sum + c.budgetVnd, 0),
    prepaidFundBalance: wallet.pointsBalance,
    totalCreators: new Set(creatorSetRaw.map((x) => x.accountId)).size,
    totalVideosSubmitted,
    totalSalesConversions: totalSales._sum.amountVnd ?? 0
  };
}

function toOnboardingStatus(brand: Brand | null) {
  const completed = Boolean(
    brand?.legalName &&
      brand.industry &&
      brand.taxCode &&
      brand.productCategories &&
      brand.inventoryDescription &&
      brand.bccAgreementVersion &&
      brand.legalResponsibilityAccepted &&
      brand.revenueSharePercent !== null &&
      brand.commissionRatePercent !== null
  );

  return {
    completed,
    legalName: brand?.legalName ?? "",
    industry: brand?.industry ?? "",
    taxCode: brand?.taxCode ?? "",
    businessLicenseUrl: brand?.businessLicenseUrl ?? "",
    productCategories: brand?.productCategories ?? "",
    inventoryDescription: brand?.inventoryDescription ?? "",
    revenueSharePercent: brand?.revenueSharePercent ?? 70,
    commissionRatePercent: brand?.commissionRatePercent ?? 10,
    bccAgreementVersion: brand?.bccAgreementVersion ?? "BCC-dCreator-v1",
    bccAgreementTerms: brand?.bccAgreementTerms ?? "",
    legalResponsibilityAccepted: brand?.legalResponsibilityAccepted ?? false,
    contractFileUrl: brand?.contractFileUrl ?? "",
    contractSignedAt: brand?.contractSignedAt?.toISOString() ?? null,
    status: brand?.status ?? null
  };
}

async function ensureBrandForOwner(accountId: string) {
  const existing = await prisma.brand.findFirst({
    where: { ownerAccountId: accountId },
    orderBy: { createdAt: "desc" }
  });
  if (existing) return existing;

  const [account, latestApplication] = await Promise.all([
    prisma.account.findUnique({ where: { id: accountId }, select: { email: true, displayName: true } }),
    prisma.brandApplication.findFirst({ where: { accountId }, orderBy: { createdAt: "desc" } })
  ]);

  if (!account) throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND");

  return prisma.brand.create({
    data: {
      ownerAccountId: accountId,
      name: latestApplication?.brandName ?? account.displayName ?? "Brand",
      logoUrl: latestApplication?.logoUrl ?? null,
      legalName: latestApplication?.legalName ?? null,
      industry: latestApplication?.industry ?? null,
      website: latestApplication?.website ?? null,
      fanpage: latestApplication?.fanpage ?? null,
      address: latestApplication?.address ?? null,
      contactName: latestApplication?.contactName ?? account.displayName ?? "Brand Owner",
      contactPhone: latestApplication?.contactPhone ?? "",
      contactEmail: latestApplication?.contactEmail ?? account.email,
      description: latestApplication?.description ?? null,
      businessGoal: latestApplication?.businessGoal ?? null,
      taxCode: latestApplication?.taxCode ?? null,
      businessLicenseUrl: latestApplication?.businessLicenseUrl ?? null,
      representativeName: latestApplication?.representativeName ?? null,
      representativePhone: latestApplication?.representativePhone ?? null,
      representativeEmail: latestApplication?.representativeEmail ?? null,
      productCategories: latestApplication?.productCategories ?? null,
      inventoryDescription: latestApplication?.inventoryDescription ?? null,
      revenueSharePercent: latestApplication?.revenueSharePercent ?? null,
      commissionRatePercent: latestApplication?.commissionRatePercent ?? null,
      bccAgreementVersion: latestApplication?.bccAgreementVersion ?? null,
      legalResponsibilityAccepted: latestApplication?.legalResponsibilityAccepted ?? false,
      contractFileUrl: latestApplication?.contractFileUrl ?? null,
      contractSignedAt: latestApplication?.contractSignedAt ?? null
    }
  });
}

export async function getBrandOnboarding(accountId: string) {
  const brand = await ensureBrandForOwner(accountId);
  return toOnboardingStatus(brand);
}

export async function updateBrandOnboarding(accountId: string, input: BrandOnboardingInput) {
  const brand = await ensureBrandForOwner(accountId);
  const isRequestReview = Boolean(input.requestAdminReview);
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { email: true, displayName: true, profile: { select: { phone: true } } }
  });
  if (!account) throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND");

  const updated = await prisma.brand.update({
    where: { id: brand.id },
    data: {
      legalName: input.legalName ?? brand.legalName,
      industry: input.industry ?? brand.industry,
      taxCode: input.taxCode ?? brand.taxCode,
      businessLicenseUrl: input.businessLicenseUrl === undefined ? brand.businessLicenseUrl : input.businessLicenseUrl || null,
      productCategories: input.productCategories ?? brand.productCategories,
      inventoryDescription: input.inventoryDescription ?? brand.inventoryDescription,
      revenueSharePercent: input.revenueSharePercent ?? brand.revenueSharePercent,
      commissionRatePercent: input.commissionRatePercent ?? brand.commissionRatePercent,
      bccAgreementVersion: input.bccAgreementVersion ?? brand.bccAgreementVersion,
      bccAgreementTerms: input.bccAgreementTerms ?? brand.bccAgreementTerms,
      legalResponsibilityAccepted: input.legalResponsibilityAccepted,
      contractFileUrl: input.contractFileUrl === undefined ? brand.contractFileUrl : input.contractFileUrl || null,
      contractSignedAt: isRequestReview ? null : new Date()
    }
  });

  if (isRequestReview) {
    const latestApplication = await prisma.brandApplication.findFirst({
      where: { accountId },
      orderBy: { createdAt: "desc" }
    });

    const applicationData = {
      brandName: brand.name,
      logoUrl: brand.logoUrl,
      legalName: input.legalName ?? brand.legalName ?? "",
      industry: input.industry ?? brand.industry ?? "",
      website: brand.website,
      fanpage: brand.fanpage,
      address: brand.address,
      contactName: brand.contactName || account.displayName || "Brand Owner",
      contactPhone: brand.contactPhone || account.profile?.phone || "000000",
      contactEmail: brand.contactEmail || account.email,
      description: brand.description,
      businessGoal: brand.businessGoal,
      taxCode: input.taxCode ?? brand.taxCode ?? "",
      businessLicenseUrl: input.businessLicenseUrl ?? brand.businessLicenseUrl ?? "",
      representativeName: brand.representativeName,
      representativePhone: brand.representativePhone,
      representativeEmail: brand.representativeEmail,
      representativeIdentityNumber: latestApplication?.representativeIdentityNumber ?? null,
      bankAccountName: latestApplication?.bankAccountName ?? null,
      bankAccountNumber: latestApplication?.bankAccountNumber ?? null,
      bankName: latestApplication?.bankName ?? null,
      productCategories: input.productCategories ?? brand.productCategories ?? "",
      inventoryDescription: input.inventoryDescription ?? brand.inventoryDescription ?? "",
      expectedCampaignBudget: latestApplication?.expectedCampaignBudget ?? null,
      expectedCreatorCount: latestApplication?.expectedCreatorCount ?? null,
      revenueSharePercent: input.revenueSharePercent ?? brand.revenueSharePercent ?? null,
      commissionRatePercent: input.commissionRatePercent ?? brand.commissionRatePercent ?? null,
      bccAgreementAccepted: input.bccAgreementAccepted ?? false,
      bccAgreementVersion: input.bccAgreementVersion ?? brand.bccAgreementVersion ?? null,
      bccAgreementTerms: input.bccAgreementTerms ?? brand.bccAgreementTerms ?? null,
      legalResponsibilityAccepted: input.legalResponsibilityAccepted,
      contractFileUrl: input.contractFileUrl ?? brand.contractFileUrl ?? "",
      contractSignedAt: null,
      rejectReason: null,
      reviewNote: "Brand requested onboarding/BCC update and admin review.",
      reviewedById: null,
      reviewedAt: null
    };

    if (latestApplication && latestApplication.status === ApplicationStatus.PENDING_REVIEW) {
      await prisma.brandApplication.update({
        where: { id: latestApplication.id },
        data: {
          ...applicationData,
          status: ApplicationStatus.PENDING_REVIEW
        }
      });
    } else {
      await prisma.brandApplication.create({
        data: {
          accountId,
          status: ApplicationStatus.PENDING_REVIEW,
          ...applicationData
        }
      });
    }
  }

  return toOnboardingStatus(updated);
}

export async function getBrandProfile(accountId: string) {
  const [account, brand, latestApplication] = await Promise.all([
    prisma.account.findUnique({ where: { id: accountId }, include: { profile: true } }),
    prisma.brand.findFirst({ where: { ownerAccountId: accountId }, orderBy: { createdAt: "desc" } }),
    prisma.brandApplication.findFirst({ where: { accountId }, orderBy: { createdAt: "desc" } })
  ]);
  if (!account) throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
  const meta = parseBrandMeta(account.profile?.socialLinks);
  const bccSource = brand ?? latestApplication;
  return {
    ...meta.brandProfile,
    bccAgreement: bccSource
      ? {
          revenueSharePercent: bccSource.revenueSharePercent,
          commissionRatePercent: bccSource.commissionRatePercent,
          bccAgreementVersion: bccSource.bccAgreementVersion,
          legalResponsibilityAccepted: bccSource.legalResponsibilityAccepted,
          contractFileUrl: bccSource.contractFileUrl,
          contractSignedAt: bccSource.contractSignedAt?.toISOString() ?? null,
          status: brand ? brand.status : latestApplication?.status ?? null
        }
      : null
  };
}

export async function updateBrandProfile(accountId: string, input: BrandProfileInput) {
  const current = await prisma.profile.findUnique({ where: { accountId } });
  const meta = parseBrandMeta(current?.socialLinks);

  await prisma.account.update({
    where: { id: accountId },
    data: { displayName: input.brandName, avatarUrl: input.logoUrl || null }
  });

  await prisma.profile.upsert({
    where: { accountId },
    create: {
      accountId,
      bio: input.businessInfo,
      socialLinks: { ...meta, brandProfile: input }
    },
    update: {
      bio: input.businessInfo,
      socialLinks: { ...meta, brandProfile: input }
    }
  });

  return getBrandProfile(accountId);
}

export async function listProducts(accountId: string) {
  const profile = await prisma.profile.findUnique({ where: { accountId } });
  return parseBrandMeta(profile?.socialLinks).products;
}

export async function upsertProduct(accountId: string, input: ProductInput) {
  const profile = await prisma.profile.findUnique({ where: { accountId } });
  const meta = parseBrandMeta(profile?.socialLinks);

  const product = {
    id: input.id ?? randomUUID(),
    sku: input.sku,
    name: input.name,
    stockQty: input.stockQty,
    voucherStock: input.voucherStock,
    campaignEligibility: input.campaignEligibility,
    priceVnd: input.priceVnd ?? 0,
    pricePoints: input.pricePoints ?? 0
  };

  const nextProducts = [...meta.products.filter((p) => p.id !== product.id), product];

  await prisma.profile.upsert({
    where: { accountId },
    create: { accountId, socialLinks: { ...meta, products: nextProducts } },
    update: { socialLinks: { ...meta, products: nextProducts } }
  });

  return product;
}

export async function createBrandCampaign(accountId: string, input: CampaignInput) {
  const campaign = await prisma.campaign.create({
    data: {
      brandId: accountId,
      slug: input.slug,
      title: input.title,
      brief: input.brief,
      budgetVnd: input.budgetVnd,
      targetAmountVnd: input.targetAmountVnd ?? input.budgetVnd,
      category: input.category,
      campaignType: input.campaignType,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      status: "DRAFT"
    }
  });

  await prisma.analyticsEvent.create({
    data: {
      eventName: "brand_create_campaign",
      userId: accountId,
      sessionId: `srv_${accountId}`,
      campaignId: campaign.id,
      brandId: accountId
    }
  });

  return campaign;
}

export async function editDraftCampaign(accountId: string, campaignId: string, input: CampaignInput) {
  const campaign = await getBrandScopedCampaign(campaignId, accountId);
  if (campaign.status !== "DRAFT") throw new AppError("Only draft campaign can be edited", 409, "CAMPAIGN_NOT_DRAFT");

  return prisma.campaign.update({
    where: { id: campaignId },
    data: {
      slug: input.slug,
      title: input.title,
      brief: input.brief,
      budgetVnd: input.budgetVnd,
      targetAmountVnd: input.targetAmountVnd ?? input.budgetVnd,
      category: input.category,
      campaignType: input.campaignType,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null
    }
  });
}

export async function submitCampaignForAdminReview(accountId: string, campaignId: string) {
  const campaign = await getBrandScopedCampaign(campaignId, accountId);
  if (campaign.status !== "DRAFT") throw new AppError("Only draft campaign can be submitted", 409, "CAMPAIGN_NOT_DRAFT");

  const profile = await prisma.profile.findUnique({ where: { accountId } });
  const meta = parseBrandMeta(profile?.socialLinks);
  if (meta.brandProfile.verificationStatus !== "VERIFIED") {
    throw new AppError("Brand must be verified before publishing campaign", 403, "BRAND_NOT_VERIFIED");
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "PAUSED" }
  });

  await prisma.auditLog.create({
    data: {
      actorId: accountId,
      action: "CAMPAIGN_SUBMITTED_FOR_REVIEW",
      targetType: "Campaign",
      targetId: campaignId,
      metadata: { fromStatus: "DRAFT", toStatus: "PAUSED" }
    }
  });

  return updated;
}

export async function listBrandCampaigns(accountId: string) {
  return prisma.campaign.findMany({ where: { brandId: accountId }, orderBy: { createdAt: "desc" } });
}

export async function addRewardTier(accountId: string, input: RewardInput) {
  await getBrandScopedCampaign(input.campaignId, accountId);
  if (input.stockTotal < 0) throw new AppError("Reward stock cannot be negative", 422, "NEGATIVE_STOCK");

  return prisma.reward.create({
    data: {
      campaignId: input.campaignId,
      title: input.title,
      description: input.description,
      pointsCost: input.pricePoints,
      stockTotal: input.stockTotal,
      stockRemaining: input.stockTotal,
      isActive: true
    }
  });
}

export async function listCreatorApplications(accountId: string) {
  return prisma.missionSubmission.findMany({
    where: {
      mission: {
        campaign: { brandId: accountId },
        audience: { in: [MissionAudience.CREATOR, MissionAudience.USER] }
      },
      lifecycleStatus: { in: ["ACCEPTED", "DOING"] }
    },
    include: {
      account: {
        select: {
          id: true,
          displayName: true,
          email: true,
          creatorProfile: {
            select: {
              mainPlatform: true,
              socialUrl: true,
              followerCount: true
            }
          }
        }
      },
      mission: { select: { id: true, title: true, campaign: { select: { id: true, title: true } } } }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function decideCreatorApplication(accountId: string, input: CreatorApplicationDecisionInput) {
  const submission = await prisma.missionSubmission.findUnique({
    where: { id: input.submissionId },
    include: { mission: { include: { campaign: true } } }
  });
  if (!submission) throw new AppError("Submission not found", 404, "SUBMISSION_NOT_FOUND");
  if (submission.mission.campaign.brandId !== accountId) throw new AppError("Forbidden", 403, "BRAND_FORBIDDEN");

  if (input.decision === "APPROVED") {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.missionSubmission.update({
        where: { id: input.submissionId },
        data: { lifecycleStatus: "DOING", note: input.note, rejectReason: null, reviewedAt: new Date(), reviewedById: accountId }
      });

      await ensureCreatorMissionFromApprovedApplication(tx, {
        missionId: submission.missionId,
        campaignId: submission.mission.campaignId,
        accountId: submission.accountId,
        applicationId: submission.id
      });

      return updated;
    });
  }

  return prisma.missionSubmission.update({
    where: { id: input.submissionId },
    data: { lifecycleStatus: "REJECTED", status: "REJECTED", rejectReason: input.note ?? "Rejected by brand" }
  });
}

export async function listBrandProofs(accountId: string) {
  return prisma.missionSubmission.findMany({
    where: {
      mission: { campaign: { brandId: accountId }, audience: MissionAudience.CREATOR },
      lifecycleStatus: { in: ["PENDING_REVIEW", "REJECTED"] }
    },
    include: {
      account: { select: { id: true, displayName: true } },
      mission: { select: { id: true, title: true, campaign: { select: { id: true, title: true } } } }
    },
    orderBy: { updatedAt: "asc" }
  });
}

export async function reviewBrandProof(accountId: string, role: Role, input: ProofReviewDecisionInput) {
  const submission = await prisma.missionSubmission.findUnique({
    where: { id: input.submissionId },
    include: { mission: { include: { campaign: true } } }
  });
  if (!submission) throw new AppError("Submission not found", 404, "SUBMISSION_NOT_FOUND");
  if (submission.mission.campaign.brandId !== accountId) throw new AppError("Forbidden", 403, "BRAND_FORBIDDEN");

  if (input.decision === "APPROVED") return approveProof(input.submissionId, accountId, role, input.note);
  if (input.decision === "REJECTED") return rejectProof(input.submissionId, accountId, role, input.rejectReason ?? "", input.note);

  return prisma.missionSubmission.update({
    where: { id: input.submissionId },
    data: {
      lifecycleStatus: "REJECTED",
      status: "REJECTED",
      rejectReason: input.rejectReason ?? "Need revision",
      reviewedAt: new Date(),
      reviewedById: accountId
    }
  });
}

export async function topupBrandFund(accountId: string, input: BudgetTopupInput) {
  return createTopupPayment(accountId, input.amountVnd, input.idempotencyKey);
}

export async function lockCampaignBudget(accountId: string, input: BudgetLockInput) {
  const campaign = await getBrandScopedCampaign(input.campaignId, accountId);
  const wallet = await ensureWalletByAccountId(accountId);
  if (wallet.pointsBalance < input.amountVnd / 100) {
    throw new AppError("Insufficient prepaid fund balance", 409, "INSUFFICIENT_PREPAID_BALANCE");
  }

  await prisma.auditLog.create({
    data: {
      actorId: accountId,
      action: "CAMPAIGN_BUDGET_LOCKED",
      targetType: "Campaign",
      targetId: campaign.id,
      metadata: { amountVnd: input.amountVnd, idempotencyKey: input.idempotencyKey }
    }
  });

  return { campaignId: campaign.id, lockedAmountVnd: input.amountVnd, status: "LOCKED" as const };
}

export async function getBrandBudget(accountId: string) {
  const wallet = await ensureWalletByAccountId(accountId);
  const tx = await getWalletTransactions(accountId, 1, 30);
  return { prepaidFundBalance: wallet.pointsBalance, transactionHistory: tx.items };
}

export async function getBrandAnalytics(accountId: string) {
  const campaigns = await prisma.campaign.findMany({ where: { brandId: accountId }, select: { id: true, title: true } });
  const campaignIds = campaigns.map((x) => x.id);

  const [topCreatorRaw, topProductRaw, voucherRedemption, conversionRaw, campaignPerformance] = await Promise.all([
    prisma.missionSubmission.groupBy({
      by: ["accountId"],
      where: { mission: { campaignId: { in: campaignIds } }, lifecycleStatus: { in: ["APPROVED", "DONE"] } },
      _count: { _all: true },
      orderBy: { _count: { accountId: "desc" } },
      take: 1
    }),
    prisma.reward.findMany({
      where: { campaignId: { in: campaignIds } },
      orderBy: { stockRemaining: "asc" },
      take: 1,
      select: { id: true, title: true, stockTotal: true, stockRemaining: true }
    }),
    prisma.rewardClaim.count({ where: { reward: { campaignId: { in: campaignIds } }, status: "USED" } }),
    prisma.contribution.aggregate({
      _count: { _all: true },
      _sum: { amountVnd: true },
      where: { campaignId: { in: campaignIds }, status: "SUCCESS" }
    }),
    prisma.campaign.findMany({
      where: { id: { in: campaignIds } },
      select: { id: true, title: true, fundedAmountVnd: true, backerCount: true }
    })
  ]);

  const topCreator = topCreatorRaw[0]
    ? await prisma.account.findUnique({ where: { id: topCreatorRaw[0].accountId }, select: { id: true, displayName: true } })
    : null;

  const kpis = await getBrandKpis(accountId);

  return {
    campaignPerformance,
    topCreator,
    topProduct: topProductRaw[0] ?? null,
    voucherRedemption,
    conversionRate: conversionRaw._count._all > 0 ? Number(((conversionRaw._sum.amountVnd ?? 0) / conversionRaw._count._all).toFixed(2)) : 0,
    kpis
  };
}

export async function createProductSubmissionForReview(accountId: string, input: ProductSubmissionInput) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  const brand = await ensureBrandForOwner(accountId);
  if (input.campaignId) {
    await getBrandScopedCampaign(input.campaignId, accountId);
  }

  return prismaAny.productSubmission.create({
    data: {
      brandId: brand.id,
      campaignId: input.campaignId ?? null,
      name: input.name,
      sku: input.sku ?? null,
      description: input.description ?? null,
      unitPriceVnd: input.unitPriceVnd,
      reviewStatus: "PENDING_REVIEW",
      inventoryBatches: {
        create: {
          batchCode: input.batchCode ?? null,
          quantityTotal: input.quantityTotal,
          quantityRemaining: input.quantityTotal,
          stockStatus: "IN_STOCK"
        }
      }
    },
    include: { inventoryBatches: true }
  });
}

export async function listProductSubmissionsForBrand(accountId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  const brand = await ensureBrandForOwner(accountId);
  return prismaAny.productSubmission.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: "desc" },
    include: { inventoryBatches: true }
  });
}
