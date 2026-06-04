import { BrandMemberRole, BrandMemberStatus, BrandStatus, CampaignStatus, CreatorChannelVerificationStatus, CreatorSocialLinkStatus, MissionAudience, MissionLifecycleStatus, Prisma, Role, RoleRequestStatus, RoleRequestType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { approveProof, rejectProof } from "@/lib/services/mission.service";
import {
  approvePublishReportByAdmin,
  approveVideoReviewByAdmin,
  approvePurchaseProofByAdmin,
  confirmDepositAndProductReceivedByAdmin,
  ensureCreatorMissionFromApprovedApplication,
  listCreatorMissionsForAdmin,
  rejectPublishReportByAdmin,
  rejectVideoReviewByAdmin,
  rejectPurchaseProofByAdmin
} from "@/lib/services/creator-mission.service";
import { writeAuditLog } from "@/lib/services/audit-log.service";
import { listAdminVouchers } from "@/lib/services/voucher.service";
import { scanFraudRiskSignals } from "@/lib/services/fraud-flag.service";
import { getAdminKpis } from "@/lib/services/analytics.service";

const COVER_MARKER = "[[COVER_IMAGE_URL]]:";

function extractCoverImageMeta(brief: string) {
  const lines = brief.split("\n");
  const markerLine = lines.find((line) => line.trim().startsWith(COVER_MARKER));
  const coverImageUrl = markerLine ? markerLine.trim().slice(COVER_MARKER.length).trim() : null;
  const cleanBrief = lines
    .filter((line) => !line.trim().startsWith(COVER_MARKER))
    .join("\n")
    .trim();

  return { coverImageUrl, cleanBrief };
}

async function createDefaultMissionsFromRequest(
  tx: Prisma.TransactionClient,
  campaignId: string,
  missionTypes: string | null,
  budgetVnd: number,
  endsAt: Date | null
) {
  const labels = (missionTypes ?? "")
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (labels.length === 0) {
    await tx.mission.create({
      data: {
        campaignId,
        title: "Nhiệm vụ mặc định",
        description: "Tham gia chiến dịch theo brief và nộp bằng chứng đúng hạn.",
        rewardPoints: 0,
        rewardCommissionVnd: Math.max(0, Math.floor(budgetVnd * 0.02)),
        audience: "CREATOR",
        productReceiveOption: "NO_PRODUCT_REQUIRED",
        deadlineAt: endsAt
      }
    });
    return;
  }

  const commissionPerMission = Math.max(0, Math.floor(budgetVnd * 0.02));
  for (const label of labels) {
    await tx.mission.create({
      data: {
        campaignId,
        title: `Mission: ${label}`,
        description: `Thực hiện nhiệm vụ "${label}" theo yêu cầu campaign và nộp proof để duyệt.`,
        rewardPoints: 0,
        rewardCommissionVnd: commissionPerMission,
        audience: "CREATOR",
        productReceiveOption: "NO_PRODUCT_REQUIRED",
        deadlineAt: endsAt
      }
    });
  }
}

export async function getAdminOverview() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  const [
    totalUsers,
    totalCreators,
    totalBrands,
    activeCampaigns,
    pendingReviews,
    totalContributions,
    fraudAlerts,
    pendingBrandRequests,
    pendingCreatorRequests,
    pendingCampaignReviews,
    pendingCreatorApplications,
    pendingContentSubmissions,
    pendingPayouts,
    activeBrands,
    activeCreators,
    pendingProductInventoryReviews,
    pendingFulfillmentIssues,
    totalCommissionPaid,
    failedPayments24h,
    overdueActiveCampaigns
  ] = await Promise.all([
    prisma.account.count(),
    prisma.creatorProfile.count(),
    prisma.brand.count(),
    prisma.campaign.count({ where: { status: CampaignStatus.ACTIVE } }),
    prisma.roleRequest.count({ where: { status: RoleRequestStatus.PENDING } }),
    prisma.contribution.aggregate({ _sum: { amountVnd: true }, where: { status: "SUCCESS" } }),
    prisma.riskFlag.count(),
    prisma.brand.count({
      where: {
        OR: [
          { isLocked: true },
          { status: { in: [BrandStatus.PENDING_VERIFICATION, BrandStatus.REJECTED, BrandStatus.SUSPENDED, BrandStatus.LOCKED] } }
        ]
      }
    }),
    prisma.creatorProfile.count({
      where: {
        OR: [
          { isSuspended: true },
          {
            socialLinks: {
              some: {
                OR: [
                  { verificationStatus: { in: [CreatorChannelVerificationStatus.PENDING, CreatorChannelVerificationStatus.REJECTED] } },
                  { status: CreatorSocialLinkStatus.REJECTED }
                ]
              }
            }
          }
        ]
      }
    }),
    prisma.brandCampaignRequest.count({ where: { status: { in: ["PENDING_REVIEW", "NEEDS_REVISION"] } } }),
    prisma.missionSubmission.count({
      where: {
        mission: { audience: "CREATOR" },
        lifecycleStatus: { in: ["ACCEPTED", "DOING"] }
      }
    }),
    prisma.missionSubmission.count({ where: { lifecycleStatus: "PENDING_REVIEW" } }),
    prisma.payoutRequest.count({ where: { status: "PENDING" } }),
    prisma.brand.count({ where: { status: "ACTIVE" } }),
    prisma.creatorProfile.count({ where: { isSuspended: false, account: { isActive: true } } }),
    prismaAny.productSubmission.count({
      where: { reviewStatus: { in: ["PENDING_REVIEW", "CHANGES_REQUESTED"] } }
    }),
    prismaAny.fulfillmentOrder.count({
      where: { status: { in: ["PENDING", "FAILED"] } }
    }),
    prisma.walletTransaction.aggregate({
      _sum: { cashDeltaVnd: true },
      where: { type: "COMMISSION_PAYOUT" }
    }),
    prisma.paymentTransaction.count({
      where: {
        status: "FAILED",
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    }),
    prisma.campaign.count({
      where: {
        status: CampaignStatus.ACTIVE,
        endsAt: { lt: new Date() }
      }
    })
  ]);

  const systemAlerts: string[] = [];
  if (failedPayments24h >= 10) {
    systemAlerts.push(`High failed payments in 24h: ${failedPayments24h}`);
  }
  if (fraudAlerts > 0) {
    systemAlerts.push(`Fraud flags detected: ${fraudAlerts}`);
  }
  if (pendingPayouts >= 20) {
    systemAlerts.push(`Large payout queue: ${pendingPayouts}`);
  }
  if (overdueActiveCampaigns > 0) {
    systemAlerts.push(`Campaign overdue: ${overdueActiveCampaigns}`);
  }

  return {
    totalUsers,
    totalCreators,
    totalBrands,
    activeCampaigns,
    pendingReviews,
    totalContributions: totalContributions._sum.amountVnd ?? 0,
    fraudAlerts,
    queues: {
      brandPendingReview: pendingBrandRequests,
      creatorPendingReview: pendingCreatorRequests,
      campaignPendingReview: pendingCampaignReviews,
      creatorApplicationsPendingReview: pendingCreatorApplications,
      contentSubmissionsPendingReview: pendingContentSubmissions,
      productInventoryPendingReview: pendingProductInventoryReviews,
      fulfillmentPendingIssues: pendingFulfillmentIssues,
      payoutPendingReview: pendingPayouts
    },
    paymentFailed: failedPayments24h,
    payoutPending: pendingPayouts,
    fraudFlags: fraudAlerts,
    campaignOverdue: overdueActiveCampaigns,
    totals: {
      activeCampaigns,
      activeBrands,
      activeCreators,
      grossRevenueVnd: totalContributions._sum.amountVnd ?? 0,
      commissionPayoutVnd: Math.abs(totalCommissionPaid._sum.cashDeltaVnd ?? 0)
    },
    systemAlerts
  };
}

export async function getProductInventorySnapshot(input: { page: number; limit: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  const [total, products] = await prisma.$transaction([
    prismaAny.productSubmission.count({
      where: { reviewStatus: { in: ["PENDING_REVIEW", "CHANGES_REQUESTED"] } }
    }),
    prismaAny.productSubmission.findMany({
      where: { reviewStatus: { in: ["PENDING_REVIEW", "CHANGES_REQUESTED"] } },
      orderBy: { updatedAt: "asc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      select: {
        id: true,
        name: true,
        sku: true,
        reviewStatus: true,
        reviewNote: true,
        updatedAt: true,
        brand: { select: { id: true, name: true } },
        inventoryBatches: {
          select: {
            id: true,
            batchCode: true,
            quantityTotal: true,
            quantityRemaining: true,
            stockStatus: true
          }
        }
      }
    })
  ]);

  return {
    items: products,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.limit))
    }
  };
}

export async function getFulfillmentSnapshot(input: { page: number; limit: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  const [total, orders] = await prisma.$transaction([
    prismaAny.fulfillmentOrder.count({
      where: { status: { in: ["PENDING", "FAILED"] } }
    }),
    prismaAny.fulfillmentOrder.findMany({
      where: { status: { in: ["PENDING", "FAILED"] } },
      orderBy: { updatedAt: "asc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      select: {
        id: true,
        status: true,
        failureReason: true,
        recipientName: true,
        recipientPhone: true,
        shippingAddress: true,
        updatedAt: true,
        campaign: { select: { id: true, title: true } },
        inventoryBatch: {
          select: {
            id: true,
            batchCode: true,
            productSubmission: { select: { id: true, name: true } }
          }
        },
        creatorAccount: { select: { id: true, displayName: true, email: true } }
      }
    })
  ]);

  return {
    items: orders,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.limit))
    }
  };
}

export async function listUsersForAdmin(input: { query?: string; page: number; limit: number }) {
  const where = input.query
    ? {
        OR: [
          { displayName: { contains: input.query, mode: "insensitive" as const } },
          { email: { contains: input.query, mode: "insensitive" as const } }
        ]
      }
    : {};

  const [total, users] = await prisma.$transaction([
    prisma.account.count({ where }),
    prisma.account.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        wallet: { select: { pointsBalance: true, cashBalanceVnd: true } }
      }
    })
  ]);

  return { items: users, pagination: { page: input.page, limit: input.limit, total, totalPages: Math.max(1, Math.ceil(total / input.limit)) } };
}

export async function lockUserByAdmin(actorId: string, userId: string) {
  const updated = await prisma.account.update({ where: { id: userId }, data: { isActive: false } });
  await writeAuditLog({ actorId, action: "USER_LOCKED", targetType: "Account", targetId: userId });
  return updated;
}

export async function unlockUserByAdmin(actorId: string, userId: string) {
  const updated = await prisma.account.update({ where: { id: userId }, data: { isActive: true } });
  await writeAuditLog({ actorId, action: "USER_UNLOCKED", targetType: "Account", targetId: userId });
  return updated;
}

export async function listRoleRequests(type: RoleRequestType) {
  return prisma.roleRequest.findMany({
    where: { type, status: RoleRequestStatus.PENDING },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      note: true,
      brandName: true,
      brandWebsite: true,
      createdAt: true,
      account: { select: { id: true, displayName: true, email: true } }
    }
  });
}

export async function approveRoleRequestByAdmin(actorId: string, requestId: string) {
  const request = await prisma.roleRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError("Role request not found", 404, "REQUEST_NOT_FOUND");
  if (request.status !== RoleRequestStatus.PENDING) throw new AppError("Role request already processed", 409, "REQUEST_PROCESSED");

  const targetRole = request.type === RoleRequestType.CREATOR ? Role.CREATOR : Role.BRAND_OWNER;
  const result = await prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({
      where: { id: request.accountId },
      select: { id: true, email: true, displayName: true }
    });
    if (!account) throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND");

    const req = await tx.roleRequest.update({
      where: { id: requestId },
      data: { status: RoleRequestStatus.APPROVED, reviewedAt: new Date(), reviewedById: actorId }
    });

    await tx.account.update({ where: { id: req.accountId }, data: { role: targetRole } });
    await tx.accountRole.upsert({
      where: { accountId_role: { accountId: req.accountId, role: targetRole } },
      create: { accountId: req.accountId, role: targetRole },
      update: {}
    });

    if (targetRole === Role.CREATOR) {
      const latestApplication = await tx.creatorApplication.findFirst({
        where: { accountId: req.accountId },
        orderBy: { createdAt: "desc" }
      });
      await tx.creatorProfile.upsert({
        where: { accountId: req.accountId },
        create: {
          accountId: req.accountId,
          displayName: latestApplication?.displayName ?? account.displayName,
          avatarUrl: latestApplication?.avatarUrl ?? null,
          bio: latestApplication?.bio ?? null,
          mainPlatform: latestApplication?.mainPlatform ?? "OTHER",
          socialUrl: latestApplication?.socialUrl ?? "https://example.com",
          handle: latestApplication?.handle ?? null,
          followerCount: latestApplication?.followerCount ?? 0,
          contentCategory: latestApplication?.contentCategory ?? null,
          portfolioUrl: latestApplication?.portfolioUrl ?? null,
          location: latestApplication?.location ?? null,
          expectedRate: latestApplication?.expectedRate ?? 0,
          maxJobsPerMonth: latestApplication?.maxJobsPerMonth ?? 0,
          realName: latestApplication?.realName ?? null,
          phone: latestApplication?.phone ?? null,
          identityNumber: latestApplication?.identityNumber ?? null,
          identityFrontUrl: latestApplication?.identityFrontUrl ?? null,
          identityBackUrl: latestApplication?.identityBackUrl ?? null,
          selfieUrl: latestApplication?.selfieUrl ?? null,
          bankAccountName: latestApplication?.bankAccountName ?? null,
          bankAccountNumber: latestApplication?.bankAccountNumber ?? null,
          bankName: latestApplication?.bankName ?? null,
          taxCode: latestApplication?.taxCode ?? null
        },
        update: {
          displayName: latestApplication?.displayName ?? account.displayName,
          avatarUrl: latestApplication?.avatarUrl ?? null,
          bio: latestApplication?.bio ?? null,
          mainPlatform: latestApplication?.mainPlatform ?? "OTHER",
          socialUrl: latestApplication?.socialUrl ?? "https://example.com",
          handle: latestApplication?.handle ?? null,
          followerCount: latestApplication?.followerCount ?? 0,
          contentCategory: latestApplication?.contentCategory ?? null,
          portfolioUrl: latestApplication?.portfolioUrl ?? null,
          location: latestApplication?.location ?? null,
          expectedRate: latestApplication?.expectedRate ?? 0,
          maxJobsPerMonth: latestApplication?.maxJobsPerMonth ?? 0
        }
      });
    }

    if (targetRole === Role.BRAND_OWNER) {
      const existingBrand = await tx.brand.findFirst({
        where: { ownerAccountId: req.accountId },
        select: { id: true }
      });
      const brand =
        existingBrand ??
        (await tx.brand.create({
          data: {
            ownerAccountId: req.accountId,
            name: request.brandName ?? `${account.displayName} Brand`,
            website: request.brandWebsite ?? null,
            contactName: account.displayName,
            contactPhone: "N/A",
            contactEmail: account.email,
            status: BrandStatus.ACTIVE,
            reviewedById: actorId,
            reviewedAt: new Date()
          },
          select: { id: true }
        }));

      await tx.brandMember.upsert({
        where: { brandId_accountId: { brandId: brand.id, accountId: req.accountId } },
        create: { brandId: brand.id, accountId: req.accountId, role: BrandMemberRole.OWNER },
        update: { role: BrandMemberRole.OWNER }
      });
    }

    return req;
  });

  await writeAuditLog({ actorId, action: `ROLE_REQUEST_${request.type}_APPROVED`, targetType: "RoleRequest", targetId: requestId });
  return result;
}

export async function rejectRoleRequestByAdmin(actorId: string, requestId: string, reason: string) {
  if (!reason.trim()) throw new AppError("Reject reason is required", 422, "REJECT_REASON_REQUIRED");
  const request = await prisma.roleRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError("Role request not found", 404, "REQUEST_NOT_FOUND");
  if (request.status !== RoleRequestStatus.PENDING) throw new AppError("Role request already processed", 409, "REQUEST_PROCESSED");

  const result = await prisma.roleRequest.update({
    where: { id: requestId },
    data: { status: RoleRequestStatus.REJECTED, reviewedAt: new Date(), reviewedById: actorId, note: reason }
  });

  await writeAuditLog({ actorId, action: `ROLE_REQUEST_${request.type}_REJECTED`, targetType: "RoleRequest", targetId: requestId, metadata: { reason } });
  return result;
}

export async function listPendingCampaignReviews() {
  return prisma.brandCampaignRequest.findMany({
    where: { status: { in: ["PENDING_REVIEW", "NEEDS_REVISION"] } },
    select: {
      id: true,
      requestedSlug: true,
      title: true,
      brief: true,
      status: true,
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
      adminNote: true,
      brandFeedback: true,
      createdAt: true,
      updatedAt: true,
      brand: { select: { id: true, name: true, ownerAccountId: true, contactEmail: true } },
      createdCampaign: { select: { id: true, slug: true, title: true, status: true } }
    },
    orderBy: { updatedAt: "asc" }
  });
}

export async function decideCampaignReview(actorId: string, campaignId: string, decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED", reason?: string) {
  if ((decision === "REJECTED" || decision === "CHANGES_REQUESTED") && !reason?.trim()) {
    throw new AppError("Reject reason is required", 422, "REJECT_REASON_REQUIRED");
  }

  const request = await prisma.brandCampaignRequest.findUnique({ where: { id: campaignId }, include: { brand: true } });
  if (!request) throw new AppError("Campaign request not found", 404, "CAMPAIGN_REQUEST_NOT_FOUND");

  const updated = await prisma.$transaction(async (tx) => {
    if (decision === "APPROVED") {
      const { coverImageUrl, cleanBrief } = extractCoverImageMeta(request.brief);
      const campaign = await tx.campaign.create({
        data: {
          brandId: request.brand.ownerAccountId,
          slug: request.requestedSlug,
          title: request.title,
          brief: cleanBrief,
          coverImageUrl: coverImageUrl || null,
          budgetVnd: request.budgetVnd,
          targetAmountVnd: request.targetAmountVnd,
          category: request.category,
          campaignType: request.campaignType,
          setupSource: request.setupSource,
          objective: request.objective,
          priorityChannels: request.priorityChannels,
          missionTypes: request.missionTypes,
          creatorCommissionPercent: request.creatorCommissionPercent,
          userCommissionPercent: request.userCommissionPercent,
          bonusBudgetVnd: request.bonusBudgetVnd,
          feasibilityStatus: "APPROVED",
          feasibilityNote: reason ?? null,
          brandApprovalStatus: "APPROVED",
          startsAt: request.startsAt,
          endsAt: request.endsAt,
          status: CampaignStatus.ACTIVE
        }
      });
      const requestRoadmap = request.priorityChannels
        ? request.priorityChannels.split("\n").map((item) => item.trim()).filter(Boolean)
        : [];
      try {
        await tx.$executeRaw`UPDATE "Campaign" SET "benefits" = ${request.objective}, "participationRoadmap" = ${requestRoadmap} WHERE "id" = ${campaign.id}`;
      } catch {
        // Backward compatibility when DB has not applied migration yet.
      }

      await createDefaultMissionsFromRequest(
        tx,
        campaign.id,
        request.missionTypes,
        request.budgetVnd,
        request.endsAt
      );

      return tx.brandCampaignRequest.update({
        where: { id: request.id },
        data: {
          status: "APPROVED",
          adminNote: reason ?? null,
          reviewedById: actorId,
          reviewedAt: new Date(),
          createdCampaignId: campaign.id
        },
        include: { createdCampaign: true, brand: true }
      });
    }

    return tx.brandCampaignRequest.update({
      where: { id: request.id },
      data: {
        status: decision === "REJECTED" ? "REJECTED" : "NEEDS_REVISION",
        adminNote: reason ?? null,
        reviewedById: actorId,
        reviewedAt: new Date()
      },
      include: { createdCampaign: true, brand: true }
    });
  });

  await writeAuditLog({ actorId, action: `CAMPAIGN_REQUEST_${decision}`, targetType: "BrandCampaignRequest", targetId: campaignId, metadata: { reason: reason ?? null } });
  return updated;
}

export async function listPendingProofs() {
  return prisma.missionSubmission.findMany({
    where: { lifecycleStatus: { in: ["PENDING_REVIEW", "REJECTED"] } },
    orderBy: { updatedAt: "asc" },
    include: { mission: { include: { campaign: { select: { id: true, title: true, brandId: true } } } }, account: { select: { id: true, displayName: true } } }
  });
}

export async function decideProofByAdmin(actorId: string, actorRole: Role, submissionId: string, decision: "APPROVED" | "REJECTED" | "OVERRIDE_APPROVE", reason?: string, note?: string) {
  if (decision === "REJECTED" && !reason?.trim()) throw new AppError("Reject reason is required", 422, "REJECT_REASON_REQUIRED");

  const result =
    decision === "REJECTED"
      ? await rejectProof(submissionId, actorId, actorRole, reason ?? "", note)
      : await approveProof(submissionId, actorId, actorRole, note);

  await writeAuditLog({ actorId, action: `PROOF_${decision}`, targetType: "MissionSubmission", targetId: submissionId, metadata: { reason: reason ?? null, note: note ?? null } });
  return result;
}

export async function getVoucherManagement(input: { code?: string; user?: string; campaign?: string; page: number; limit: number }) {
  return listAdminVouchers(input);
}

export async function getFinanceSnapshot() {
  const [paymentTransactions, walletTransactions, payoutRequests, brandPrepaidFunds] = await Promise.all([
    prisma.paymentTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, provider: true, requestedAmountVnd: true, status: true, createdAt: true, accountId: true } }),
    prisma.walletTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, accountId: true, type: true, pointsDelta: true, cashDeltaVnd: true, createdAt: true } }),
    prisma.payoutRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, accountId: true, amountVnd: true, status: true, createdAt: true } }),
    prisma.wallet.findMany({
      where: { user: { ownedBrandMemberships: { some: { status: BrandMemberStatus.ACTIVE } } } },
      select: { userId: true, pointsBalance: true, cashBalanceVnd: true, updatedAt: true }
    })
  ]);

  return { paymentTransactions, walletTransactions, payoutRequests, brandPrepaidFunds };
}

export async function getFraudRiskSnapshot() {
  return scanFraudRiskSignals();
}

export async function getAuditLogs(input: { action?: string; targetType?: string; page: number; limit: number }) {
  const where = {
    ...(input.action ? { action: { contains: input.action, mode: "insensitive" as const } } : {}),
    ...(input.targetType ? { targetType: { contains: input.targetType, mode: "insensitive" as const } } : {})
  };

  const [total, items] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (input.page - 1) * input.limit, take: input.limit })
  ]);

  return { items, pagination: { page: input.page, limit: input.limit, total, totalPages: Math.max(1, Math.ceil(total / input.limit)) } };
}

export async function getAdminAnalytics() {
  return getAdminKpis();
}

export async function listCreatorCampaignApplicationsForAdmin(status?: MissionLifecycleStatus, query?: string) {
  return prisma.missionSubmission.findMany({
    where: {
      mission: {
        audience: { in: [MissionAudience.CREATOR, MissionAudience.USER] }
      },
      lifecycleStatus: status ?? { in: ["ACCEPTED", "DOING", "REJECTED"] },
      ...(query
        ? {
            OR: [
              { account: { displayName: { contains: query, mode: "insensitive" } } },
              { account: { email: { contains: query, mode: "insensitive" } } },
              { mission: { title: { contains: query, mode: "insensitive" } } },
              { mission: { campaign: { title: { contains: query, mode: "insensitive" } } } }
            ]
          }
        : {})
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
      mission: {
        select: {
          id: true,
          title: true,
          audience: true,
          campaign: { select: { id: true, title: true, slug: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function decideCreatorCampaignApplicationByAdmin(
  actorId: string,
  submissionId: string,
  decision: "APPROVED" | "REJECTED",
  rejectReason?: string,
  note?: string
) {
  const current = await prisma.missionSubmission.findUnique({
    where: { id: submissionId },
    include: { mission: { include: { campaign: true } } }
  });
  if (!current) throw new AppError("Submission not found", 404, "SUBMISSION_NOT_FOUND");
  if (current.lifecycleStatus === "DONE") throw new AppError("Submission already finalized", 409, "SUBMISSION_FINALIZED");

  const updated = await prisma.$transaction(async (tx) => {
    const next = decision === "APPROVED"
      ? await tx.missionSubmission.update({
          where: { id: submissionId },
          data: {
            lifecycleStatus: "DOING",
            note: note ?? current.note,
            rejectReason: null,
            reviewedAt: new Date(),
            reviewedById: actorId
          }
        })
      : await tx.missionSubmission.update({
          where: { id: submissionId },
          data: {
            lifecycleStatus: "REJECTED",
            status: "REJECTED",
            rejectReason: rejectReason ?? "Rejected by admin",
            note: note ?? current.note,
            reviewedAt: new Date(),
            reviewedById: actorId
          }
        });

    if (decision === "APPROVED") {
      await ensureCreatorMissionFromApprovedApplication(tx, {
        missionId: current.missionId,
        campaignId: current.mission.campaignId,
        accountId: current.accountId,
        applicationId: current.id
      });
    }

    return next;
  });

  await writeAuditLog({
    actorId,
    action: `ADMIN_CREATOR_CAMPAIGN_APPLICATION_${decision}`,
    targetType: "MissionSubmission",
    targetId: submissionId,
    metadata: {
      campaignId: current.mission.campaignId,
      missionId: current.missionId,
      rejectReason: rejectReason ?? null,
      note: note ?? null
    }
  });

  return updated;
}

export async function listCreatorMissionWorkflowForAdmin() {
  return listCreatorMissionsForAdmin();
}

export async function decideCreatorMissionWorkflowByAdmin(
  actorId: string,
  creatorMissionId: string,
  action:
    | "CONFIRM_DEPOSIT_AND_PRODUCT_RECEIVED"
    | "APPROVE_PURCHASE_PROOF"
    | "REJECT_PURCHASE_PROOF"
    | "APPROVE_VIDEO_REVIEW"
    | "REJECT_VIDEO_REVIEW"
    | "APPROVE_PUBLISH_REPORT"
    | "REJECT_PUBLISH_REPORT",
  reason?: string,
  purchaseAmountVnd?: number
) {
  if (action === "CONFIRM_DEPOSIT_AND_PRODUCT_RECEIVED") {
    return confirmDepositAndProductReceivedByAdmin(actorId, creatorMissionId);
  }
  if (action === "APPROVE_PURCHASE_PROOF") {
    return approvePurchaseProofByAdmin(actorId, creatorMissionId);
  }
  if (action === "REJECT_PURCHASE_PROOF") {
    return rejectPurchaseProofByAdmin(actorId, creatorMissionId, reason);
  }
  if (action === "APPROVE_VIDEO_REVIEW") {
    return approveVideoReviewByAdmin(actorId, creatorMissionId);
  }
  if (action === "REJECT_VIDEO_REVIEW") {
    return rejectVideoReviewByAdmin(actorId, creatorMissionId, reason ?? "Video review rejected");
  }
  if (action === "APPROVE_PUBLISH_REPORT") {
    return approvePublishReportByAdmin(actorId, creatorMissionId, purchaseAmountVnd ?? 0);
  }
  return rejectPublishReportByAdmin(actorId, creatorMissionId, reason ?? "Publish report rejected", [
    "PUBLIC_URL",
    "AD_CODE",
    "SCREENSHOT",
    "PURCHASE_BILL",
    "PRODUCT_REVIEW_SCREENSHOT"
  ]);
}
