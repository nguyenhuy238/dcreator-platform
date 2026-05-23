import { randomUUID } from "node:crypto";
import { CampaignStatus, MissionAudience, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { approveProof, rejectProof } from "@/lib/services/mission.service";
import { getBrandKpis } from "@/lib/services/analytics.service";
import { ensureCreatorMissionFromApprovedApplication } from "@/lib/services/creator-mission.service";
import { createTopupPayment, ensureWalletByAccountId, getWalletTransactions } from "@/lib/services/wallet.service";
import type { z } from "zod";
import type {
  brandProfileSchema,
  budgetLockSchema,
  budgetTopupSchema,
  campaignCreateSchema,
  creatorApplicationDecisionSchema,
  productSchema,
  proofReviewDecisionSchema,
  rewardTierSchema
} from "@/lib/validators/brand-dashboard";

type BrandProfileInput = z.infer<typeof brandProfileSchema>;
type ProductInput = z.infer<typeof productSchema>;
type CampaignInput = z.infer<typeof campaignCreateSchema>;
type RewardInput = z.infer<typeof rewardTierSchema>;
type CreatorApplicationDecisionInput = z.infer<typeof creatorApplicationDecisionSchema>;
type ProofReviewDecisionInput = z.infer<typeof proofReviewDecisionSchema>;
type BudgetLockInput = z.infer<typeof budgetLockSchema>;
type BudgetTopupInput = z.infer<typeof budgetTopupSchema>;

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

export async function getBrandProfile(accountId: string) {
  const account = await prisma.account.findUnique({ where: { id: accountId }, include: { profile: true } });
  if (!account) throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
  const meta = parseBrandMeta(account.profile?.socialLinks);
  return meta.brandProfile;
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
