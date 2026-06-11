import { randomUUID } from "node:crypto";
import { Brand, BrandInventoryBatch, BrandMemberRole, BrandProduct, CampaignStatus, MissionAudience, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { APPLICATION_STATUS } from "@/lib/constants/enums";
import { campaignRequestMarkers, extractCampaignRequestMarkerValue, extractCampaignRequestMeta } from "@/lib/campaign-request-meta";
import { AppError } from "@/lib/errors";
import { normalizeImageUrlInput } from "@/lib/images/resolve-image-url";
import { approveProof, rejectProof } from "@/lib/services/mission.service";
import { getBrandKpis } from "@/lib/services/analytics.service";
import { ensureCreatorMissionFromApprovedApplication } from "@/lib/services/creator-mission.service";
import { createTopupPayment, ensureWalletByAccountId, getWalletTransactions } from "@/lib/services/wallet.service";
import { createNotification, createNotificationForAdminOps } from "@/lib/services/notification.service";
import { writeAuditLog } from "@/lib/services/audit-log.service";
import type { z } from "zod";
import type {
  brandMemberInviteSchema,
  brandMemberRemoveSchema,
  brandMemberRoleUpdateSchema,
  brandProfileSchema,
  brandOnboardingSchema,
  budgetLockSchema,
  budgetTopupSchema,
  campaignBrandFeedbackSchema,
  campaignCreateSchema,
  campaignMissionCreateSchema,
  campaignRequestSchema,
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
type CampaignBrandFeedbackInput = z.infer<typeof campaignBrandFeedbackSchema>;
type CampaignRequestInput = z.infer<typeof campaignRequestSchema>;
type RewardInput = z.infer<typeof rewardTierSchema>;
type CampaignMissionInput = z.infer<typeof campaignMissionCreateSchema>;
type CreatorApplicationDecisionInput = z.infer<typeof creatorApplicationDecisionSchema>;
type ProofReviewDecisionInput = z.infer<typeof proofReviewDecisionSchema>;
type BudgetLockInput = z.infer<typeof budgetLockSchema>;
type BudgetTopupInput = z.infer<typeof budgetTopupSchema>;
type ApplicationStatusValue = (typeof APPLICATION_STATUS)[number];
type ProductSubmissionInput = z.infer<typeof productSubmissionSchema>;
type BrandMemberInviteInput = z.infer<typeof brandMemberInviteSchema>;
type BrandMemberRoleUpdateInput = z.infer<typeof brandMemberRoleUpdateSchema>;
type BrandMemberRemoveInput = z.infer<typeof brandMemberRemoveSchema>;
const COVER_MARKER = campaignRequestMarkers.cover;
const CONTENT_FILE_MARKER = campaignRequestMarkers.content;
const REQUIREMENTS_MARKER = campaignRequestMarkers.requirements;

function sanitizeCampaignImageUrl(input?: string | null) {
  const value = normalizeImageUrlInput(input);
  return value || null;
}

function extractMarkerValue(text: string | null | undefined, marker: string) {
  if (!text) return "";
  return extractCampaignRequestMarkerValue(text, marker);
}

function extractRequirementsValue(text: string | null | undefined) {
  const encoded = extractMarkerValue(text, REQUIREMENTS_MARKER);
  if (!encoded) return "";
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

function buildCampaignRequestBrief(input: { title: string; imageUrl?: string | null; contentFileUrl?: string | null; requirements?: string | null }) {
  return [
    `Yêu cầu tạo campaign từ Brand: ${input.title}`,
    input.imageUrl ? `${COVER_MARKER}${input.imageUrl}` : "",
    input.contentFileUrl ? `${CONTENT_FILE_MARKER}${input.contentFileUrl}` : "",
    input.requirements?.trim() ? `${REQUIREMENTS_MARKER}${encodeURIComponent(input.requirements.trim())}` : ""
  ].filter(Boolean).join("\n");
}

async function trySyncCampaignNewFields(campaignId: string, benefits: string | null, participationRoadmap: string[]) {
  try {
    await prisma.$executeRaw`UPDATE "Campaign" SET "benefits" = ${benefits}, "participationRoadmap" = ${participationRoadmap} WHERE "id" = ${campaignId}`;
  } catch {
    // Backward compatibility when DB has not applied migration yet.
  }
}

async function trySyncCampaignRequestNewFields(requestId: string, benefits: string | null, participationRoadmap: string[]) {
  try {
    await prisma.$executeRaw`UPDATE "BrandCampaignRequest" SET "benefits" = ${benefits}, "participationRoadmap" = ${participationRoadmap} WHERE "id" = ${requestId}`;
  } catch {
    // Backward compatibility when DB has not applied migration yet.
  }
}

type BrandProductWithBatches = BrandProduct & { batches: BrandInventoryBatch[] };

type BrandMeta = {
  brandProfile: {
    brandName: string;
    contactName: string;
    contactEmail: string;
    logoUrl: string;
    businessInfo: string;
    verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  };
  products: Array<{
    id: string;
    sku: string;
    name: string;
    description: string;
    imageUrl: string;
    stockQty: number;
    voucherStock: number;
    campaignEligibility: boolean;
    suggestedPriceVnd: number;
    costPriceVnd: number;
    priceVnd: number;
    pricePoints: number;
    returnPolicy: string;
    batches: Array<{
      id: string;
      quantity: number;
      expiryDate: string;
      fulfillmentType: "NONE_WAREHOUSE" | "BRAND_FULFILLMENT";
      opsStatus: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
      appraisedValueVnd: number;
      viableMarginPercent: number;
      opsNote: string;
    }>;
  }>;
};

type VerificationStatus = BrandMeta["brandProfile"]["verificationStatus"];

type CreatorMeta = {
  categories: string[];
  socialLinks: Array<{ label: string; url: string }>;
};

function parseBrandMeta(value: unknown): BrandMeta {
  const fallback: BrandMeta = {
    brandProfile: {
      brandName: "",
      contactName: "",
      contactEmail: "",
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
          contactName: typeof (profile as { contactName?: unknown }).contactName === "string" ? (profile as { contactName: string }).contactName : "",
          contactEmail: typeof (profile as { contactEmail?: unknown }).contactEmail === "string" ? (profile as { contactEmail: string }).contactEmail : "",
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
        .map((p) => {
          const rawProduct = p as Record<string, unknown>;
          const batches = Array.isArray(rawProduct.batches)
            ? rawProduct.batches
                .filter((batch) => batch && typeof batch === "object")
                .map((batch) => {
                  const rawBatch = batch as Record<string, unknown>;
                  const fulfillmentType: "NONE_WAREHOUSE" | "BRAND_FULFILLMENT" =
                    rawBatch.fulfillmentType === "NONE_WAREHOUSE" || rawBatch.fulfillmentType === "BRAND_FULFILLMENT"
                      ? rawBatch.fulfillmentType
                      : "BRAND_FULFILLMENT";
                  const opsStatus: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" =
                    rawBatch.opsStatus === "PENDING_REVIEW" || rawBatch.opsStatus === "APPROVED" || rawBatch.opsStatus === "REJECTED" || rawBatch.opsStatus === "DRAFT"
                      ? rawBatch.opsStatus
                      : "DRAFT";
                  return {
                    id: typeof rawBatch.id === "string" ? rawBatch.id : randomUUID(),
                    quantity: typeof rawBatch.quantity === "number" ? rawBatch.quantity : 0,
                    expiryDate: typeof rawBatch.expiryDate === "string" ? rawBatch.expiryDate : "",
                    fulfillmentType,
                    opsStatus,
                    appraisedValueVnd: typeof rawBatch.appraisedValueVnd === "number" ? rawBatch.appraisedValueVnd : 0,
                    viableMarginPercent: typeof rawBatch.viableMarginPercent === "number" ? rawBatch.viableMarginPercent : 0,
                    opsNote: typeof rawBatch.opsNote === "string" ? rawBatch.opsNote : ""
                  };
                })
            : [];

          return {
            id: typeof rawProduct.id === "string" ? rawProduct.id : randomUUID(),
            sku: typeof rawProduct.sku === "string" ? rawProduct.sku : "",
            name: typeof rawProduct.name === "string" ? rawProduct.name : "",
            description: typeof rawProduct.description === "string" ? rawProduct.description : "",
            imageUrl: typeof rawProduct.imageUrl === "string" ? rawProduct.imageUrl : "",
            stockQty: typeof rawProduct.stockQty === "number" ? rawProduct.stockQty : 0,
            voucherStock: typeof rawProduct.voucherStock === "number" ? rawProduct.voucherStock : 0,
            campaignEligibility: typeof rawProduct.campaignEligibility === "boolean" ? rawProduct.campaignEligibility : true,
            suggestedPriceVnd: typeof rawProduct.suggestedPriceVnd === "number" ? rawProduct.suggestedPriceVnd : typeof rawProduct.priceVnd === "number" ? rawProduct.priceVnd : 0,
            costPriceVnd: typeof rawProduct.costPriceVnd === "number" ? rawProduct.costPriceVnd : 0,
            priceVnd: typeof rawProduct.priceVnd === "number" ? rawProduct.priceVnd : typeof rawProduct.suggestedPriceVnd === "number" ? rawProduct.suggestedPriceVnd : 0,
            pricePoints: typeof rawProduct.pricePoints === "number" ? rawProduct.pricePoints : 0,
            returnPolicy: typeof rawProduct.returnPolicy === "string" ? rawProduct.returnPolicy : "",
            batches
          };
        })
    : [];

  return { brandProfile: parsedProfile, products: parsedProducts };
}

async function getBrandScopedCampaign(campaignId: string, brandId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
  const [linked, brand] = await Promise.all([
    prisma.brandCampaignRequest.findFirst({
      where: { brandId, createdCampaignId: campaignId },
      select: { id: true }
    }),
    prisma.brand.findUnique({
      where: { id: brandId },
      select: { ownerAccountId: true }
    })
  ]);
  const isLegacyOwnedCampaign = Boolean(brand && campaign.brandId === brand.ownerAccountId);
  if (!linked && !isLegacyOwnedCampaign) throw new AppError("Forbidden", 403, "BRAND_FORBIDDEN");
  return campaign;
}

async function getScopedCampaignIds(brandId: string, ownerAccountId: string) {
  const [linked, legacy] = await Promise.all([
    prisma.brandCampaignRequest.findMany({
      where: { brandId, createdCampaignId: { not: null } },
      select: { createdCampaignId: true }
    }),
    prisma.campaign.findMany({
      where: { brandId: ownerAccountId },
      select: { id: true }
    })
  ]);
  return [
    ...new Set([
      ...linked.map((item) => item.createdCampaignId).filter((value): value is string => Boolean(value)),
      ...legacy.map((item) => item.id)
    ])
  ];
}

type BrandActorContext = {
  brand: Brand;
  brandOwnerAccountId: string;
  membershipRole: BrandMemberRole | "OWNER";
};

async function resolveBrandActorContext(
  accountId: string,
  options?: { provisionIfOwner?: boolean; currentBrandId?: string | null }
): Promise<BrandActorContext> {
  const currentBrandId = options?.currentBrandId?.trim() || null;

  if (currentBrandId) {
    const membership = await prisma.brandMember.findFirst({
      where: { accountId, brandId: currentBrandId },
      include: { brand: true }
    });
    if (!membership) throw new AppError("Bạn không có quyền truy cập Brand này.", 403, "BRAND_FORBIDDEN");
    return { brand: membership.brand, brandOwnerAccountId: membership.brand.ownerAccountId, membershipRole: membership.role };
  }

  const membership = await prisma.brandMember.findFirst({
    where: { accountId },
    include: { brand: true },
    orderBy: { createdAt: "desc" }
  });
  if (membership) return { brand: membership.brand, brandOwnerAccountId: membership.brand.ownerAccountId, membershipRole: membership.role };

  const shouldProvision = options?.provisionIfOwner ?? true;
  if (shouldProvision) {
    const created = await ensureBrandForOwner(accountId);
    return { brand: created, brandOwnerAccountId: created.ownerAccountId, membershipRole: "OWNER" };
  }

  throw new AppError("Brand access is not configured for this account", 403, "BRAND_ACCESS_NOT_CONFIGURED");
}

function getBrandProductData(input: ProductInput) {
  return {
    sku: input.sku,
    name: input.name,
    description: input.description || null,
    imageUrl: input.imageUrl || null,
    stockQty: input.stockQty,
    voucherStock: input.voucherStock,
    campaignEligibility: input.campaignEligibility,
    suggestedPriceVnd: input.suggestedPriceVnd ?? input.priceVnd ?? 0,
    costPriceVnd: input.costPriceVnd ?? 0,
    priceVnd: input.priceVnd ?? input.suggestedPriceVnd ?? 0,
    pricePoints: input.pricePoints ?? 0,
    returnPolicy: input.returnPolicy || null
  };
}

function toBrandProductDto(product: BrandProductWithBatches) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description ?? "",
    imageUrl: product.imageUrl ?? "",
    stockQty: product.stockQty,
    voucherStock: product.voucherStock,
    campaignEligibility: product.campaignEligibility,
    suggestedPriceVnd: product.suggestedPriceVnd,
    costPriceVnd: product.costPriceVnd,
    priceVnd: product.priceVnd,
    pricePoints: product.pricePoints,
    returnPolicy: product.returnPolicy ?? "",
    batches: product.batches.map((batch) => ({
      id: batch.id,
      quantity: batch.quantity,
      expiryDate: batch.expiryDate ? batch.expiryDate.toISOString().slice(0, 10) : "",
      fulfillmentType: batch.fulfillmentType,
      opsStatus: batch.opsStatus,
      appraisedValueVnd: batch.appraisedValueVnd,
      viableMarginPercent: batch.viableMarginPercent,
      opsNote: batch.opsNote ?? ""
    }))
  };
}

export async function getBrandOverview(accountId: string, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const wallet = await ensureWalletByAccountId(ctx.brandOwnerAccountId);
  const campaignIds = await getScopedCampaignIds(ctx.brand.id, ctx.brandOwnerAccountId);
  if (campaignIds.length === 0) {
    return {
      activeCampaigns: 0,
      totalBudget: 0,
      prepaidFundBalance: wallet.pointsBalance,
      totalCreators: 0,
      totalVideosSubmitted: 0,
      totalSalesConversions: 0
    };
  }
  const [activeCampaigns, campaigns, creatorSetRaw, totalVideosSubmitted, totalSales] = await Promise.all([
    prisma.campaign.count({ where: { id: { in: campaignIds }, status: CampaignStatus.ACTIVE } }),
    prisma.campaign.findMany({ where: { id: { in: campaignIds } }, select: { id: true, budgetVnd: true } }),
    prisma.missionSubmission.findMany({
      where: { mission: { campaignId: { in: campaignIds } } },
      select: { accountId: true }
    }),
    prisma.missionSubmission.count({ where: { mission: { campaignId: { in: campaignIds } }, status: "SUBMITTED" } }),
    prisma.contribution.aggregate({ _sum: { amountVnd: true }, where: { campaignId: { in: campaignIds }, status: "SUCCESS" } })
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

function toOnboardingStatus(
  brand: Brand | null,
  latestApplication?: { bccAgreementAccepted: boolean; status: ApplicationStatusValue; reviewNote?: string | null } | null
) {
  const supplementaryBccReviewApproved =
    latestApplication?.status === "APPROVED" &&
    latestApplication?.reviewNote === "Brand requested onboarding/BCC update and admin review.";
  const bccAgreementAccepted = Boolean(
    latestApplication?.bccAgreementAccepted || (brand?.bccAgreementTerms && brand.contractSignedAt && brand.legalResponsibilityAccepted)
  );
  const completed = Boolean(
    brand?.legalName &&
      brand.industry &&
      brand.taxCode &&
      brand.productCategories &&
      brand.inventoryDescription &&
      brand.bccAgreementVersion &&
      bccAgreementAccepted &&
      brand.legalResponsibilityAccepted &&
      brand.contractSignedAt &&
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
    bccAgreementAccepted,
    bccAgreementTerms: brand?.bccAgreementTerms ?? "",
    legalResponsibilityAccepted: brand?.legalResponsibilityAccepted ?? false,
    contractFileUrl: brand?.contractFileUrl ?? "",
    contractSignedAt: brand?.contractSignedAt?.toISOString() ?? null,
    supplementaryBccReviewApproved,
    status: brand?.status ?? null,
    reviewStatus: latestApplication?.status ?? null
  };
}

async function ensureBrandForOwner(accountId: string) {
  const existing = await prisma.brand.findFirst({
    where: { ownerAccountId: accountId },
    orderBy: { createdAt: "desc" }
  });
  if (existing) return existing;

  const [account, latestApplication] = await Promise.all([
    prisma.account.findUnique({ where: { id: accountId }, select: { email: true, displayName: true, role: true } }),
    prisma.brandApplication.findFirst({ where: { accountId }, orderBy: { createdAt: "desc" } })
  ]);

  if (!account) throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND");

  const ownerRole = await prisma.accountRole.findFirst({
    where: { accountId, role: Role.BRAND_OWNER },
    select: { id: true }
  });
  const isBrandOwner = account.role === Role.BRAND_OWNER || Boolean(ownerRole);
  if (!isBrandOwner) {
    throw new AppError("Brand access is not configured for this account", 403, "BRAND_ACCESS_NOT_CONFIGURED");
  }

  await prisma.accountRole.upsert({
    where: { accountId_role: { accountId, role: Role.BRAND_OWNER } },
    create: { accountId, role: Role.BRAND_OWNER },
    update: {}
  });

  return prisma.$transaction(async (tx) => {
    const brand = await tx.brand.create({
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
    await tx.brandMember.upsert({
      where: { brandId_accountId: { brandId: brand.id, accountId } },
      create: { brandId: brand.id, accountId, role: BrandMemberRole.OWNER },
      update: { role: BrandMemberRole.OWNER }
    });
    return brand;
  });
}

export async function getBrandOnboarding(accountId: string, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const brand = ctx.brand;
  const latestApplication = await prisma.brandApplication.findFirst({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    select: { bccAgreementAccepted: true, status: true, reviewNote: true }
  });
  return toOnboardingStatus(brand, latestApplication);
}

export async function updateBrandOnboarding(accountId: string, input: BrandOnboardingInput, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const brand = ctx.brand;
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
      reviewNote: "Brand requested KYB/BCC verification update.",
      reviewedById: null,
      reviewedAt: null
    };

    if (latestApplication && latestApplication.status === "PENDING_REVIEW") {
      await prisma.brandApplication.update({
        where: { id: latestApplication.id },
        data: {
          ...applicationData,
          status: "PENDING_REVIEW"
        }
      });
    } else {
      await prisma.brandApplication.create({
        data: {
          accountId,
          status: "PENDING_REVIEW",
          ...applicationData
        }
      });
    }
    await writeAuditLog({
      actorId: accountId,
      action: "BRAND_KYB_UPDATE_SUBMITTED",
      targetType: "Brand",
      targetId: brand.id,
      oldStatus: brand.status,
      newStatus: "PENDING_REVIEW"
    });
    await createNotificationForAdminOps({
      event: "CAMPAIGN_APPROVED",
      title: "Brand gửi cập nhật KYB/BCC",
      content: `${brand.name} đã gửi cập nhật KYB/BCC để Ops kiểm tra.`,
      metadata: { brandId: brand.id, ownerAccountId: brand.ownerAccountId },
      excludeAccountId: accountId
    });
  } else {
    await writeAuditLog({
      actorId: accountId,
      action: "BRAND_ONBOARDING_UPDATED",
      targetType: "Brand",
      targetId: brand.id,
      oldStatus: brand.status,
      newStatus: brand.status
    });
  }

  return toOnboardingStatus(updated, {
    bccAgreementAccepted: input.bccAgreementAccepted,
    status: isRequestReview ? "PENDING_REVIEW" : "APPROVED"
  });
}

export async function getBrandProfile(accountId: string, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const [account, brand, latestApplication] = await Promise.all([
    prisma.account.findUnique({ where: { id: accountId }, include: { profile: true } }),
    prisma.brand.findFirst({ where: { id: ctx.brand.id } }),
    prisma.brandApplication.findFirst({ where: { accountId }, orderBy: { createdAt: "desc" } })
  ]);
  if (!account) throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
  const meta = parseBrandMeta(account.profile?.socialLinks);
  const bccSource = brand ?? latestApplication;
  const verificationStatus =
    brand?.status === "ACTIVE"
      ? "VERIFIED"
      : brand?.status === "PENDING_VERIFICATION"
        ? "PENDING"
        : brand?.status === "REJECTED"
          ? "REJECTED"
          : meta.brandProfile.verificationStatus;
  return {
    ...meta.brandProfile,
    brandName: brand?.name || latestApplication?.brandName || meta.brandProfile.brandName || account.displayName || "",
    contactName: brand?.contactName || latestApplication?.contactName || meta.brandProfile.contactName || account.displayName || "",
    contactEmail: brand?.contactEmail || latestApplication?.contactEmail || meta.brandProfile.contactEmail || account.email || "",
    logoUrl: brand?.logoUrl || latestApplication?.logoUrl || meta.brandProfile.logoUrl || "",
    businessInfo: brand?.description || latestApplication?.description || meta.brandProfile.businessInfo || "",
    verificationStatus,
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

export async function updateBrandProfile(accountId: string, input: BrandProfileInput, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const current = await prisma.profile.findUnique({ where: { accountId } });
  const meta = parseBrandMeta(current?.socialLinks);

  await prisma.brand.update({
    where: { id: ctx.brand.id },
    data: {
      name: input.brandName,
      contactName: input.contactName || input.brandName,
      contactEmail: input.contactEmail || undefined,
      logoUrl: input.logoUrl || null,
      description: input.businessInfo || null
    }
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

  return getBrandProfile(accountId, ctx.brand.id);
}

export async function listProducts(accountId: string, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const brand = ctx.brand;
  const products = await prisma.brandProduct.findMany({
    where: { brandId: brand.id },
    include: { batches: { orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" }
  });

  if (products.length > 0) return products.map(toBrandProductDto);

  const profile = await prisma.profile.findUnique({ where: { accountId } });
  return parseBrandMeta(profile?.socialLinks).products;
}

export async function upsertProduct(accountId: string, input: ProductInput, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const brand = ctx.brand;
  const existing = input.id
    ? await prisma.brandProduct.findFirst({ where: { id: input.id, brandId: brand.id }, select: { id: true } })
    : await prisma.brandProduct.findUnique({ where: { brandId_sku: { brandId: brand.id, sku: input.sku } }, select: { id: true } });

  const product = await prisma.$transaction(async (tx) => {
    const savedProduct = existing
      ? await tx.brandProduct.update({
          where: { id: existing.id },
          data: getBrandProductData(input)
        })
      : await tx.brandProduct.create({
          data: {
            brandId: brand.id,
            ...getBrandProductData(input)
          }
        });

    await tx.brandInventoryBatch.deleteMany({ where: { productId: savedProduct.id } });
    if (input.batches.length > 0) {
      await tx.brandInventoryBatch.createMany({
        data: input.batches.map((batch) => ({
          productId: savedProduct.id,
          quantity: batch.quantity,
          expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : null,
          fulfillmentType: batch.fulfillmentType,
          opsStatus: batch.opsStatus,
          appraisedValueVnd: batch.appraisedValueVnd ?? 0,
          viableMarginPercent: batch.viableMarginPercent ?? 0,
          opsNote: batch.opsNote || null
        }))
      });
    }

    return tx.brandProduct.findUniqueOrThrow({
      where: { id: savedProduct.id },
      include: { batches: { orderBy: { createdAt: "desc" } } }
    });
  });

  const dto = toBrandProductDto(product);
  await writeAuditLog({
    actorId: accountId,
    action: "BRAND_PRODUCT_UPSERT",
    targetType: "BrandProduct",
    targetId: dto.id,
    metadata: { brandId: brand.id, sku: dto.sku }
  });
  await createNotificationForAdminOps({
    event: "CAMPAIGN_APPROVED",
    title: "Brand cập nhật sản phẩm/lô hàng",
    content: `${brand.name} vừa cập nhật sản phẩm ${dto.name} (${dto.sku}).`,
    metadata: { brandId: brand.id, productId: dto.id },
    excludeAccountId: accountId
  });
  return dto;
}

export async function createBrandCampaign(accountId: string, input: CampaignInput, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const campaign = await prisma.campaign.create({
    data: {
      brandId: ctx.brandOwnerAccountId,
      slug: input.slug,
      title: input.title,
      brief: input.brief,
      budgetVnd: 10000000,
      targetAmountVnd: 10000000,
      category: input.category,
      campaignType: input.campaignType,
      setupSource: input.setupSource,
      objective: input.benefits || null,
      priorityChannels: input.participationRoadmap.join("\n"),
      missionTypes: null,
      creatorCommissionPercent: 0,
      userCommissionPercent: 0,
      bonusBudgetVnd: 0,
      coverImageUrl: sanitizeCampaignImageUrl(input.imageUrl),
      feasibilityStatus: "DRAFT",
      brandApprovalStatus: "DRAFT",
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
      brandId: ctx.brandOwnerAccountId
    }
  });
  await writeAuditLog({
    actorId: accountId,
    action: "BRAND_CAMPAIGN_CREATED",
    targetType: "Campaign",
    targetId: campaign.id,
    newStatus: campaign.status
  });
  await createNotificationForAdminOps({
    event: "CAMPAIGN_APPROVED",
    title: "Brand tạo campaign draft",
    content: `${ctx.brand.name} vừa tạo campaign "${campaign.title}".`,
    metadata: { campaignId: campaign.id, brandId: ctx.brand.id },
    excludeAccountId: accountId
  });
  await trySyncCampaignNewFields(campaign.id, input.benefits || null, input.participationRoadmap);

  return campaign;
}

export async function editDraftCampaign(accountId: string, campaignId: string, input: CampaignInput, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const campaign = await getBrandScopedCampaign(campaignId, ctx.brand.id);
  if (campaign.status !== "DRAFT") throw new AppError("Only draft campaign can be edited", 409, "CAMPAIGN_NOT_DRAFT");

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      slug: input.slug,
      title: input.title,
      brief: input.brief,
      budgetVnd: 10000000,
      targetAmountVnd: 10000000,
      category: input.category,
      campaignType: input.campaignType,
      setupSource: input.setupSource,
      objective: input.benefits || null,
      priorityChannels: input.participationRoadmap.join("\n"),
      missionTypes: null,
      creatorCommissionPercent: 0,
      userCommissionPercent: 0,
      bonusBudgetVnd: 0,
      coverImageUrl: sanitizeCampaignImageUrl(input.imageUrl),
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null
    }
  });
  await trySyncCampaignNewFields(campaignId, input.benefits || null, input.participationRoadmap);
  return updated;
}

export async function submitCampaignForAdminReview(accountId: string, campaignId: string, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const campaign = await getBrandScopedCampaign(campaignId, ctx.brand.id);
  if (campaign.status !== "DRAFT") throw new AppError("Only draft campaign can be submitted", 409, "CAMPAIGN_NOT_DRAFT");

  const profile = await prisma.profile.findUnique({ where: { accountId: ctx.brandOwnerAccountId } });
  const meta = parseBrandMeta(profile?.socialLinks);
  if (meta.brandProfile.verificationStatus !== "VERIFIED") {
    throw new AppError("Brand must be verified before publishing campaign", 403, "BRAND_NOT_VERIFIED");
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "PAUSED",
      feasibilityStatus: "PENDING_REVIEW",
      brandApprovalStatus: "WAITING_DCREATOR_REVIEW",
      brandFeedback: null
    }
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
  await createNotificationForAdminOps({
    event: "CAMPAIGN_APPROVED",
    title: "Campaign chờ admin review",
    content: `Campaign "${updated.title}" đã được brand submit để duyệt.`,
    metadata: { campaignId: updated.id, brandOwnerAccountId: ctx.brandOwnerAccountId },
    excludeAccountId: accountId
  });

  return updated;
}

export async function approveCampaignForPublish(accountId: string, campaignId: string, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const campaign = await getBrandScopedCampaign(campaignId, ctx.brand.id);
  if (campaign.status !== "PAUSED") throw new AppError("Campaign is not waiting for approval", 409, "CAMPAIGN_NOT_WAITING_APPROVAL");
  if (campaign.feasibilityStatus !== "APPROVED") throw new AppError("Admin has not approved feasibility yet", 409, "CAMPAIGN_FEASIBILITY_NOT_APPROVED");

  return prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "ACTIVE",
      brandApprovalStatus: "APPROVED",
      brandFeedback: null
    }
  });
}

export async function requestCampaignAdjustment(accountId: string, campaignId: string, input: CampaignBrandFeedbackInput, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const campaign = await getBrandScopedCampaign(campaignId, ctx.brand.id);
  if (campaign.status !== "PAUSED" && campaign.status !== "DRAFT") throw new AppError("Campaign is not waiting for feedback", 409, "CAMPAIGN_NOT_WAITING_FEEDBACK");

  return prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "PAUSED",
      feasibilityStatus: "PENDING_REVIEW",
      brandApprovalStatus: "WAITING_DCREATOR_REVIEW",
      brandFeedback: input.feedback
    }
  });
}

export async function listBrandCampaigns(accountId: string, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const campaignIds = await getScopedCampaignIds(ctx.brand.id, ctx.brandOwnerAccountId);
  const reviewableMissionWhere: Prisma.CreatorMissionWhereInput = {
    campaignId: { in: campaignIds },
    OR: [
      {
        missionId: null,
        OR: [{ campaign: { endsAt: null } }, { campaign: { endsAt: { gte: new Date() } } }]
      },
      { mission: { deadlineAt: null } },
      { mission: { deadlineAt: { gte: new Date() } } }
    ]
  };
  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: campaignIds } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          contributions: true,
          missions: true
        }
      }
    }
  });

  const appliedCreatorPairs = await prisma.creatorMission.groupBy({
    by: ["campaignId", "accountId"],
    where: { campaignId: { in: campaignIds } }
  });

  const campaignApplicationCountMap = new Map<string, number>();
  for (const row of appliedCreatorPairs) {
    campaignApplicationCountMap.set(row.campaignId, (campaignApplicationCountMap.get(row.campaignId) ?? 0) + 1);
  }

  const approvedCreatorPairs = await prisma.creatorMission.groupBy({
    by: ["campaignId", "accountId"],
    where: {
      campaignId: { in: campaignIds },
      applicationStatus: "APPROVED"
    }
  });

  const creatorJoinedByCampaignId = new Map<string, number>();
  for (const row of approvedCreatorPairs) {
    creatorJoinedByCampaignId.set(row.campaignId, (creatorJoinedByCampaignId.get(row.campaignId) ?? 0) + 1);
  }

  const [pendingApplicationCounts, pendingTranscriptCounts, pendingVideoCounts, pendingPublishCounts, completedCounts] = await Promise.all([
    prisma.creatorMission.groupBy({
      by: ["campaignId"],
      where: { ...reviewableMissionWhere, applicationStatus: "PENDING_REVIEW" },
      _count: { _all: true }
    }),
    prisma.creatorMission.groupBy({
      by: ["campaignId"],
      where: {
        ...reviewableMissionWhere,
        applicationStatus: "APPROVED",
        status: "DRAFT_PENDING",
        submissionStatus: "SUBMITTED",
        OR: [
          { submissionTranscriptTextNote: { not: null } },
          { submissionTranscriptResourceUrl: { not: null } }
        ]
      },
      _count: { _all: true }
    }),
    prisma.creatorMission.groupBy({
      by: ["campaignId"],
      where: { ...reviewableMissionWhere, videoReviewStatus: "PENDING" },
      _count: { _all: true }
    }),
    prisma.creatorMission.groupBy({
      by: ["campaignId"],
      where: { ...reviewableMissionWhere, publishStatus: "PENDING" },
      _count: { _all: true }
    }),
    prisma.creatorMission.groupBy({
      by: ["campaignId"],
      where: {
        ...reviewableMissionWhere,
        applicationStatus: "APPROVED",
        status: "COMPLETED"
      },
      _count: { _all: true }
    })
  ]);

  const reviewPendingCountMap = new Map<string, number>();
  for (const group of [pendingApplicationCounts, pendingTranscriptCounts, pendingVideoCounts, pendingPublishCounts]) {
    for (const row of group) {
      reviewPendingCountMap.set(row.campaignId, (reviewPendingCountMap.get(row.campaignId) ?? 0) + row._count._all);
    }
  }

  const completedCountMap = new Map<string, number>();
  for (const row of completedCounts) {
    completedCountMap.set(row.campaignId, row._count._all);
  }

  return campaigns.map((campaign) => {
    const videoTarget = Math.max(0, campaign.ugcVideoQuota ?? 0);
    const videoApproved = completedCountMap.get(campaign.id) ?? 0;
    const videoProgressPercent = videoTarget > 0 ? Math.min(100, Math.round((videoApproved / videoTarget) * 100)) : 0;
    return {
      ...campaign,
      applicationCount: campaignApplicationCountMap.get(campaign.id) ?? 0,
      creatorJoinedCount: creatorJoinedByCampaignId.get(campaign.id) ?? 0,
      reviewPendingCount: reviewPendingCountMap.get(campaign.id) ?? 0,
      videoTarget,
      videoApproved,
      videoProgressPercent
    };
  });
}

function parseCreatorMeta(value: unknown): CreatorMeta {
  const fallback: CreatorMeta = { categories: [], socialLinks: [] };
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Record<string, unknown>;
  const categories = Array.isArray(raw.categories)
    ? raw.categories.filter((item): item is string => typeof item === "string")
    : [];
  const socialLinks = Array.isArray(raw.socialLinks)
    ? raw.socialLinks.filter(
        (item): item is { label: string; url: string } =>
          Boolean(item && typeof item === "object" && typeof (item as { label?: unknown }).label === "string" && typeof (item as { url?: unknown }).url === "string")
      )
    : [];
  return { categories, socialLinks };
}

export async function listBrandCampaignRequests(accountId: string, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const brand = ctx.brand;
  const [requests, matchingCampaigns] = await Promise.all([
    prisma.brandCampaignRequest.findMany({
      where: { brandId: brand.id },
      select: {
        id: true,
        requestedSlug: true,
        title: true,
        brief: true,
        setupSource: true,
        objective: true,
        priorityChannels: true,
        missionTypes: true,
        creatorCommissionPercent: true,
        userCommissionPercent: true,
        bonusBudgetVnd: true,
        budgetVnd: true,
        targetAmountVnd: true,
        campaignType: true,
        category: true,
        startsAt: true,
        endsAt: true,
        status: true,
        adminNote: true,
        brandFeedback: true,
        createdAt: true,
        updatedAt: true,
        createdCampaign: { select: { id: true, slug: true, title: true, status: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.campaign.findMany({
      where: { brandId: brand.ownerAccountId },
      select: { id: true, slug: true, title: true, status: true }
    })
  ]);
  const campaignBySlug = new Map(matchingCampaigns.map((campaign) => [campaign.slug, campaign]));
  return requests.map((request) => {
    const meta = extractCampaignRequestMeta(request.brief);
    return {
      ...request,
      createdCampaign: request.createdCampaign ?? campaignBySlug.get(request.requestedSlug) ?? null,
      coverImageUrl: sanitizeCampaignImageUrl(meta.coverImageUrl),
      requirements: meta.requirements
    };
  });
}

export async function createBrandCampaignRequest(accountId: string, input: CampaignRequestInput, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const brand = ctx.brand;
  const slugBase = input.title
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80) || "campaign-request";
  const requestedSlug = `${slugBase}-${Date.now().toString().slice(-6)}`;
  const briefWithMeta = buildCampaignRequestBrief({
    title: input.title,
    imageUrl: input.imageUrl,
    contentFileUrl: input.contentFileUrl,
    requirements: input.requirements
  });

  const created = await prisma.brandCampaignRequest.create({
    data: {
      brandId: brand.id,
      requestedSlug,
      title: input.title,
      brief: briefWithMeta,
      setupSource: "BRAND_REQUESTED",
      objective: null,
      priorityChannels: null,
      missionTypes: null,
      creatorCommissionPercent: 0,
      userCommissionPercent: 0,
      bonusBudgetVnd: 0,
      budgetVnd: 10000000,
      targetAmountVnd: 10000000,
      category: "LIFESTYLE",
      campaignType: "COMMUNITY",
      startsAt: null,
      endsAt: null,
      status: "PENDING_REVIEW"
    }
  });
  await trySyncCampaignRequestNewFields(created.id, null, []);
  return created;
}

export async function getBrandCampaignTemplateConfig(accountId: string, currentBrandId?: string | null) {
  await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  try {
    const rows = await prisma.$queryRaw<Array<{ campaignContentTemplateUrl: string }>>`
      SELECT "campaignContentTemplateUrl"
      FROM "AdminSetting"
      WHERE "scope" = 'global'
      LIMIT 1
    `;
    return { campaignContentTemplateUrl: rows[0]?.campaignContentTemplateUrl ?? "" };
  } catch {
    return { campaignContentTemplateUrl: "" };
  }
}

export async function respondBrandCampaignRequest(accountId: string, requestId: string, input: CampaignBrandFeedbackInput, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const brand = ctx.brand;
  const request = await prisma.brandCampaignRequest.findFirst({ where: { id: requestId, brandId: brand.id } });
  if (!request) throw new AppError("Campaign request not found", 404, "CAMPAIGN_REQUEST_NOT_FOUND");
  if (request.status !== "NEEDS_REVISION") throw new AppError("Campaign request is not waiting for Brand feedback", 409, "CAMPAIGN_REQUEST_NOT_WAITING_FEEDBACK");

  const nextTitle = input.title?.trim() || request.title;
  const nextImageUrl = input.imageUrl === undefined ? extractMarkerValue(request.brief, COVER_MARKER) : input.imageUrl;
  const nextContentFileUrl = input.contentFileUrl ?? extractMarkerValue(request.brief, CONTENT_FILE_MARKER);
  const nextRequirements = input.requirements === undefined ? extractRequirementsValue(request.brief) : input.requirements;
  const nextBrief = buildCampaignRequestBrief({
    title: nextTitle,
    imageUrl: nextImageUrl,
    contentFileUrl: nextContentFileUrl,
    requirements: nextRequirements
  });

  return prisma.brandCampaignRequest.update({
    where: { id: requestId },
    data: {
      title: nextTitle,
      brief: nextBrief,
      status: "PENDING_REVIEW",
      brandFeedback: input.feedback
    }
  });
}

export async function addRewardTier(accountId: string, input: RewardInput, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  await getBrandScopedCampaign(input.campaignId, ctx.brand.id);
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

export async function listCreatorApplications(accountId: string, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const campaignIds = await getScopedCampaignIds(ctx.brand.id, ctx.brandOwnerAccountId);
  const submissions = await prisma.missionSubmission.findMany({
    where: {
      mission: {
        campaignId: { in: campaignIds },
        audience: { in: [MissionAudience.CREATOR, MissionAudience.USER] }
      },
      lifecycleStatus: { in: ["ACCEPTED", "DOING", "REJECTED", "PENDING_REVIEW", "SUBMITTED", "APPROVED"] }
    },
    include: {
      account: {
        select: {
          id: true,
          displayName: true,
          email: true,
          profile: {
            select: {
              bio: true,
              socialLinks: true
            }
          },
          creatorProfile: {
            select: {
              mainPlatform: true,
              socialUrl: true,
              followerCount: true,
              bio: true,
              contentCategory: true,
              portfolioUrl: true,
              location: true,
              expectedRate: true,
              maxJobsPerMonth: true
            }
          },
          submissions: {
            where: {
              lifecycleStatus: { in: ["APPROVED", "DONE"] }
            },
            orderBy: { updatedAt: "desc" },
            take: 6,
            select: {
              id: true,
              lifecycleStatus: true,
              updatedAt: true,
              mission: {
                select: {
                  id: true,
                  title: true,
                  campaign: {
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                      status: true
                    }
                  }
                }
              }
            }
          }
        }
      },
      mission: { select: { id: true, title: true, audience: true, campaign: { select: { id: true, title: true } } } }
    },
    orderBy: { createdAt: "desc" }
  });

  return submissions.map((item) => {
    const meta = parseCreatorMeta(item.account.profile?.socialLinks);
    const socialMap = new Map(meta.socialLinks.map((x) => [x.label.trim().toLowerCase(), x.url]));
    const inferredCategory = meta.categories.length > 0 ? meta.categories.join(", ") : null;

    return {
      ...item,
      account: {
        ...item.account,
        creatorProfile: {
          mainPlatform: item.account.creatorProfile?.mainPlatform ?? "OTHER",
          socialUrl:
            item.account.creatorProfile?.socialUrl ??
            socialMap.get("tiktok") ??
            socialMap.get("facebook") ??
            socialMap.get("instagram") ??
            socialMap.get("youtube") ??
            "",
          followerCount: item.account.creatorProfile?.followerCount ?? null,
          bio: item.account.profile?.bio ?? item.account.creatorProfile?.bio ?? null,
          contentCategory: item.account.creatorProfile?.contentCategory ?? inferredCategory,
          portfolioUrl: item.account.creatorProfile?.portfolioUrl ?? socialMap.get("portfolio") ?? null,
          location: item.account.creatorProfile?.location ?? null,
          expectedRate: item.account.creatorProfile?.expectedRate ?? null,
          maxJobsPerMonth: item.account.creatorProfile?.maxJobsPerMonth ?? null
        }
      }
    };
  });
}

export async function addCampaignMissionForBrand(accountId: string, campaignId: string, input: CampaignMissionInput, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const campaign = await getBrandScopedCampaign(campaignId, ctx.brand.id);
  const missionCount = await prisma.mission.count({ where: { campaignId: campaign.id } });
  if (missionCount > 0) {
    throw new AppError("Mỗi campaign chỉ được phép có 1 mission.", 409, "CAMPAIGN_MISSION_LIMIT_REACHED");
  }

  const deadlineAt = input.deadlineAt ? new Date(input.deadlineAt) : null;
  if (deadlineAt && campaign.startsAt && deadlineAt < campaign.startsAt) {
    throw new AppError("Mission deadline cannot be earlier than campaign start", 422, "MISSION_DEADLINE_INVALID");
  }
  if (deadlineAt && campaign.endsAt && deadlineAt > campaign.endsAt) {
    throw new AppError("Mission deadline cannot be later than campaign end", 422, "MISSION_DEADLINE_INVALID");
  }

  return prisma.mission.create({
    data: {
      campaignId: campaign.id,
      title: input.title,
      description: input.description,
      productName: input.productReceiveOption === "PRODUCT_REQUIRED" ? input.productName || null : null,
      productDescription: input.productReceiveOption === "PRODUCT_REQUIRED" ? input.productDescription || null : null,
      productImageUrl: input.productReceiveOption === "PRODUCT_REQUIRED" ? input.productImageUrl || null : null,
      productLink: input.productReceiveOption === "PRODUCT_REQUIRED" ? input.productLink || null : null,
      rewardPoints: input.rewardPoints,
      rewardCommissionVnd: input.rewardCommissionVnd,
      audience: input.audience,
      productReceiveOption: input.productReceiveOption,
      allowRepeat: input.allowRepeat,
      deadlineAt
    }
  });
}

export async function listCampaignMissionsForBrand(accountId: string, campaignId: string, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const campaign = await getBrandScopedCampaign(campaignId, ctx.brand.id);
  const items = await prisma.mission.findMany({
    where: { campaignId: campaign.id },
    orderBy: { createdAt: "desc" }
  });
  const videoTarget = Math.max(0, campaign.ugcVideoQuota ?? 0);
  const videoApproved = Math.max(0, campaign.ugcVideoApprovedCount ?? 0);
  return {
    campaign: {
      id: campaign.id,
      title: campaign.title,
      videoTarget,
      videoApproved,
      videoQuotaReached: videoTarget > 0 && videoApproved >= videoTarget
    },
    items
  };
}

export async function decideCreatorApplication(accountId: string, input: CreatorApplicationDecisionInput, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const submission = await prisma.missionSubmission.findUnique({
    where: { id: input.submissionId },
    include: { mission: { include: { campaign: true } } }
  });
  if (!submission) throw new AppError("Submission not found", 404, "SUBMISSION_NOT_FOUND");
  await getBrandScopedCampaign(submission.mission.campaignId, ctx.brand.id);

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

      await writeAuditLog({
        actorId: accountId,
        action: "BRAND_CREATOR_APPLICATION_APPROVED",
        targetType: "MissionSubmission",
        targetId: updated.id,
        newStatus: updated.lifecycleStatus
      });
      await createNotification({
        accountId: submission.accountId,
        event: "CREATOR_APPLICATION_APPROVED",
        title: "Đơn ứng tuyển được duyệt",
        content: `Brand đã duyệt đơn ứng tuyển của bạn cho mission "${submission.mission.title}".`,
        metadata: { submissionId: submission.id, missionId: submission.missionId }
      });
      return updated;
    });
  }

  const rejected = await prisma.missionSubmission.update({
    where: { id: input.submissionId },
    data: { lifecycleStatus: "REJECTED", status: "REJECTED", rejectReason: input.note ?? "Rejected by brand" }
  });
  await writeAuditLog({
    actorId: accountId,
    action: "BRAND_CREATOR_APPLICATION_REJECTED",
    targetType: "MissionSubmission",
    targetId: rejected.id,
    newStatus: rejected.lifecycleStatus,
    reason: rejected.rejectReason
  });
  await createNotification({
    accountId: submission.accountId,
    event: "PROOF_REJECTED",
    title: "Đơn ứng tuyển bị từ chối",
    content: rejected.rejectReason ?? "Brand đã từ chối đơn ứng tuyển.",
    metadata: { submissionId: submission.id, missionId: submission.missionId }
  });
  return rejected;
}

export async function listBrandProofs(accountId: string, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const campaignIds = await getScopedCampaignIds(ctx.brand.id, ctx.brandOwnerAccountId);
  return prisma.missionSubmission.findMany({
    where: {
      mission: { campaignId: { in: campaignIds }, audience: MissionAudience.CREATOR },
      lifecycleStatus: { in: ["PENDING_REVIEW", "REJECTED", "SUBMITTED", "APPROVED", "DONE"] }
    },
    include: {
      account: {
        select: {
          id: true,
          displayName: true,
          creatorProfile: { select: { mainPlatform: true, followerCount: true } }
        }
      },
      mission: { select: { id: true, title: true, campaign: { select: { id: true, title: true } } } }
    },
    orderBy: { updatedAt: "asc" }
  });
}

export async function reviewBrandProof(accountId: string, role: Role, input: ProofReviewDecisionInput, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const submission = await prisma.missionSubmission.findUnique({
    where: { id: input.submissionId },
    include: { mission: { include: { campaign: true } } }
  });
  if (!submission) throw new AppError("Submission not found", 404, "SUBMISSION_NOT_FOUND");
  await getBrandScopedCampaign(submission.mission.campaignId, ctx.brand.id);

  if (input.decision === "APPROVED") {
    const approved = await approveProof(input.submissionId, accountId, role, input.note);
    await writeAuditLog({
      actorId: accountId,
      action: "BRAND_PROOF_APPROVED",
      targetType: "MissionSubmission",
      targetId: input.submissionId,
      newStatus: "APPROVED"
    });
    return approved;
  }
  if (input.decision === "REJECTED") {
    const rejected = await rejectProof(input.submissionId, accountId, role, input.rejectReason ?? "", input.note);
    await writeAuditLog({
      actorId: accountId,
      action: "BRAND_PROOF_REJECTED",
      targetType: "MissionSubmission",
      targetId: input.submissionId,
      newStatus: "REJECTED",
      reason: input.rejectReason ?? null
    });
    return rejected;
  }

  const revision = await prisma.missionSubmission.update({
    where: { id: input.submissionId },
    data: {
      lifecycleStatus: "REJECTED",
      status: "REJECTED",
      rejectReason: input.rejectReason ?? "Need revision",
      reviewedAt: new Date(),
      reviewedById: accountId
    }
  });
  await writeAuditLog({
    actorId: accountId,
    action: "BRAND_PROOF_REVISION_REQUESTED",
    targetType: "MissionSubmission",
    targetId: input.submissionId,
    newStatus: "REJECTED",
    reason: input.rejectReason ?? null
  });
  return revision;
}

export async function topupBrandFund(accountId: string, input: BudgetTopupInput) {
  return createTopupPayment(accountId, input.amountVnd, input.idempotencyKey);
}

export async function lockCampaignBudget(accountId: string, input: BudgetLockInput, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const campaign = await getBrandScopedCampaign(input.campaignId, ctx.brand.id);
  const wallet = await ensureWalletByAccountId(ctx.brandOwnerAccountId);
  if (wallet.pointsBalance < input.amountVnd) {
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

export async function getBrandBudget(accountId: string, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const wallet = await ensureWalletByAccountId(ctx.brandOwnerAccountId);
  const tx = await getWalletTransactions(ctx.brandOwnerAccountId, 1, 30);
  return { prepaidFundBalance: wallet.pointsBalance, transactionHistory: tx.items };
}

export async function getBrandAnalytics(accountId: string, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: await getScopedCampaignIds(ctx.brand.id, ctx.brandOwnerAccountId) } },
    select: { id: true, title: true, status: true, createdAt: true, endsAt: true }
  });
  const campaignIds = campaigns.map((x) => x.id);

  const [topCreatorRaw, topProductRaw, voucherRedemption, paymentSummary, campaignPayments, creatorMissions, applications] = await Promise.all([
    prisma.creatorMission.groupBy({
      by: ["accountId"],
      where: { campaignId: { in: campaignIds }, applicationStatus: "APPROVED" },
      _count: { _all: true },
      orderBy: { _count: { accountId: "desc" } },
      take: 1
    }),
    prisma.brandProduct.findMany({
      where: { brandId: ctx.brand.id },
      orderBy: [{ stockQty: "asc" }, { updatedAt: "desc" }],
      take: 1,
      select: { id: true, name: true, stockQty: true, voucherStock: true, priceVnd: true }
    }),
    prisma.rewardClaim.count({ where: { reward: { campaignId: { in: campaignIds } }, status: "USED" } }),
    prisma.paymentOrder.aggregate({
      _count: { _all: true },
      _sum: { amountVnd: true },
      where: { campaignId: { in: campaignIds }, status: "SUCCESS" }
    }),
    prisma.paymentOrder.groupBy({
      by: ["campaignId"],
      where: { campaignId: { in: campaignIds }, status: "SUCCESS" },
      _count: { _all: true },
      _sum: { amountVnd: true }
    }),
    prisma.creatorMission.findMany({
      where: { campaignId: { in: campaignIds } },
      select: {
        campaignId: true,
        accountId: true,
        applicationStatus: true,
        videoReviewStatus: true,
        publishStatus: true,
        submissionLifecycleStatus: true,
        submissionFinalSubmittedAt: true,
        mission: { select: { rewardCommissionVnd: true } }
      }
    }),
    prisma.missionApplication.groupBy({
      by: ["campaignId"],
      where: { campaignId: { in: campaignIds } },
      _count: { _all: true }
    })
  ]);

  const topCreator = topCreatorRaw[0]
    ? await prisma.account.findUnique({ where: { id: topCreatorRaw[0].accountId }, select: { id: true, displayName: true } })
    : null;

  const kpis = await getBrandKpis(ctx.brandOwnerAccountId);

  const paymentByCampaign = new Map(campaignPayments.map((item) => [item.campaignId, item]));
  const applicationByCampaign = new Map(applications.map((item) => [item.campaignId, item._count._all]));
  const campaignPerformance = campaigns.map((campaign) => {
    const relatedMissions = creatorMissions.filter((item) => item.campaignId === campaign.id);
    const proofSubmitted = relatedMissions.filter((item) =>
      item.videoReviewStatus !== "NOT_SUBMITTED" || item.publishStatus !== "NOT_SUBMITTED" || item.submissionFinalSubmittedAt
    ).length;
    const proofApproved = relatedMissions.filter((item) =>
      item.videoReviewStatus === "APPROVED" || item.publishStatus === "APPROVED" || ["APPROVED", "DONE"].includes(item.submissionLifecycleStatus)
    ).length;
    const commissionPaidVnd = relatedMissions
      .filter((item) => item.videoReviewStatus === "APPROVED" || item.publishStatus === "APPROVED" || ["APPROVED", "DONE"].includes(item.submissionLifecycleStatus))
      .reduce((sum, item) => sum + (item.mission?.rewardCommissionVnd ?? 0), 0);
    const payment = paymentByCampaign.get(campaign.id);

    return {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      creatorApplied: applicationByCampaign.get(campaign.id) ?? 0,
      creatorApproved: new Set(relatedMissions.filter((item) => item.applicationStatus === "APPROVED").map((item) => item.accountId)).size,
      proofSubmitted,
      proofApproved,
      orderCount: payment?._count._all ?? 0,
      revenueVnd: payment?._sum.amountVnd ?? 0,
      commissionPaidVnd,
      createdAt: campaign.createdAt,
      deadline: campaign.endsAt
    };
  });

  const topCampaign = campaignPerformance
    .slice()
    .sort((a, b) => b.revenueVnd - a.revenueVnd || b.proofApproved - a.proofApproved)[0] ?? null;

  return {
    campaignPerformance,
    topCreator,
    topProduct: topProductRaw[0] ?? null,
    voucherRedemption,
    conversionRate: paymentSummary._count._all > 0 ? Number(((paymentSummary._sum.amountVnd ?? 0) / paymentSummary._count._all).toFixed(2)) : 0,
    topCampaign,
    kpis
  };
}

export async function listBrandMembers(accountId: string, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const canManage = ctx.membershipRole === "OWNER";
  const members = await prisma.brandMember.findMany({
    where: { brandId: ctx.brand.id },
    include: {
      account: {
        select: {
          id: true,
          displayName: true,
          email: true,
          isActive: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });
  return {
    canManage,
    brand: { id: ctx.brand.id, name: ctx.brand.name, ownerAccountId: ctx.brand.ownerAccountId },
    members: members.map((item) => ({
      id: item.id,
      accountId: item.accountId,
      role: item.role,
      status: item.account.isActive ? "ACTIVE" : "DISABLED",
      joinedAt: item.createdAt,
      user: { displayName: item.account.displayName, email: item.account.email }
    }))
  };
}

export async function inviteBrandMember(accountId: string, input: BrandMemberInviteInput, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  if (ctx.membershipRole !== "OWNER") {
    throw new AppError("Only brand owner can invite members", 403, "BRAND_MEMBER_FORBIDDEN");
  }

  const account = await prisma.account.findUnique({
    where: { email: input.email },
    select: { id: true, displayName: true, email: true }
  });
  if (!account) throw new AppError("Email chưa có tài khoản trong hệ thống", 404, "ACCOUNT_NOT_FOUND");
  if (account.id === ctx.brand.ownerAccountId) {
    throw new AppError("Không thể mời owner hiện tại", 409, "OWNER_INVITE_CONFLICT");
  }

  const membership = await prisma.brandMember.upsert({
    where: { brandId_accountId: { brandId: ctx.brand.id, accountId: account.id } },
    create: {
      brandId: ctx.brand.id,
      accountId: account.id,
      role: input.role as BrandMemberRole
    },
    update: { role: input.role as BrandMemberRole }
  });

  await writeAuditLog({
    actorId: accountId,
    action: "BRAND_MEMBER_INVITED",
    targetType: "BrandMember",
    targetId: membership.id,
    metadata: { invitedAccountId: account.id, role: input.role, note: input.note ?? null }
  });
  await createNotification({
    accountId: account.id,
    event: "CAMPAIGN_APPROVED",
    title: "Bạn được thêm vào Nhãn hàng",
    content: `Bạn vừa được thêm vào nhãn hàng "${ctx.brand.name}" với vai trò ${input.role}.`,
    metadata: { brandId: ctx.brand.id, role: input.role }
  });

  return membership;
}

export async function updateBrandMemberRole(accountId: string, input: BrandMemberRoleUpdateInput, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  if (ctx.membershipRole !== "OWNER") {
    throw new AppError("Only brand owner can update member role", 403, "BRAND_MEMBER_FORBIDDEN");
  }
  const member = await prisma.brandMember.findFirst({ where: { id: input.memberId, brandId: ctx.brand.id } });
  if (!member) throw new AppError("Brand member not found", 404, "BRAND_MEMBER_NOT_FOUND");
  if (member.accountId === ctx.brand.ownerAccountId) {
    throw new AppError("Không thể thay đổi role owner cuối cùng", 409, "OWNER_LOCKED");
  }

  const updated = await prisma.brandMember.update({ where: { id: member.id }, data: { role: input.role as BrandMemberRole } });
  await writeAuditLog({
    actorId: accountId,
    action: "BRAND_MEMBER_ROLE_UPDATED",
    targetType: "BrandMember",
    targetId: member.id,
    metadata: { role: input.role }
  });
  return updated;
}

export async function removeBrandMember(accountId: string, input: BrandMemberRemoveInput, currentBrandId?: string | null) {
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  if (ctx.membershipRole !== "OWNER") {
    throw new AppError("Only brand owner can remove member", 403, "BRAND_MEMBER_FORBIDDEN");
  }
  const member = await prisma.brandMember.findFirst({ where: { id: input.memberId, brandId: ctx.brand.id } });
  if (!member) throw new AppError("Brand member not found", 404, "BRAND_MEMBER_NOT_FOUND");
  if (member.accountId === ctx.brand.ownerAccountId) {
    throw new AppError("Không thể xoá owner cuối cùng", 409, "OWNER_LOCKED");
  }
  await prisma.brandMember.delete({ where: { id: member.id } });
  await writeAuditLog({
    actorId: accountId,
    action: "BRAND_MEMBER_REMOVED",
    targetType: "BrandMember",
    targetId: member.id
  });
  return { id: member.id, removed: true };
}

export async function createProductSubmissionForReview(accountId: string, input: ProductSubmissionInput, currentBrandId?: string | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const brand = ctx.brand;
  if (input.campaignId) {
    await getBrandScopedCampaign(input.campaignId, ctx.brand.id);
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

export async function listProductSubmissionsForBrand(accountId: string, currentBrandId?: string | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  const ctx = await resolveBrandActorContext(accountId, { provisionIfOwner: true, currentBrandId });
  const brand = ctx.brand;
  return prismaAny.productSubmission.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: "desc" },
    include: { inventoryBatches: true }
  });
}
