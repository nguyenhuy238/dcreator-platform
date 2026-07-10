import { NotificationEvent, ProductReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/services/audit-log.service";
import { createNotification, createNotificationForBrandMembers } from "@/lib/services/notification.service";
import { assertStateTransition } from "@/lib/services/admin-transition.service";

const productTransitionMap: Record<ProductReviewStatus, readonly ProductReviewStatus[]> = {
  DRAFT: [],
  PENDING_REVIEW: ["APPROVED", "REJECTED", "CHANGES_REQUESTED"],
  APPROVED: [],
  REJECTED: [],
  CHANGES_REQUESTED: ["APPROVED", "REJECTED", "CHANGES_REQUESTED"]
};

function buildReviewNote(input: {
  previous?: string | null;
  note?: string;
  reason?: string;
  proposedCommissionPercent?: number;
  proposedMarginPercent?: number;
  campaignEligible?: boolean;
}) {
  const payload = {
    previousReviewNote: input.previous ?? null,
    adminNote: input.note ?? null,
    reason: input.reason ?? null,
    proposedCommissionPercent: input.proposedCommissionPercent ?? null,
    proposedMarginPercent: input.proposedMarginPercent ?? null,
    campaignEligible: input.campaignEligible ?? null,
    decidedAt: new Date().toISOString()
  };
  return JSON.stringify(payload);
}

export async function listProductSubmissionsForAdmin(status?: ProductReviewStatus, query?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  return prismaAny.productSubmission.findMany({
    where: {
      ...(status ? { reviewStatus: status } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { sku: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { brand: { name: { contains: query, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    orderBy: { updatedAt: "desc" },
    include: {
      brand: { select: { id: true, name: true, ownerAccountId: true } },
      inventoryBatches: true
    }
  });
}

export async function getProductSubmissionDetailForAdmin(productId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  const item = await prismaAny.productSubmission.findUnique({
    where: { id: productId },
    include: {
      brand: { select: { id: true, name: true, ownerAccountId: true, industry: true, contactEmail: true } },
      campaign: { select: { id: true, title: true, status: true } },
      inventoryBatches: true,
      reviewedBy: { select: { id: true, displayName: true, email: true } }
    }
  });
  if (!item) throw new AppError("Product submission not found", 404, "PRODUCT_SUBMISSION_NOT_FOUND");
  return item;
}

export async function decideProductSubmissionByAdmin(input: {
  actorId: string;
  productId: string;
  decision: ProductReviewStatus;
  reason?: string;
  note?: string;
  proposedCommissionPercent?: number;
  proposedMarginPercent?: number;
  campaignEligible?: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  const current = await prismaAny.productSubmission.findUnique({
    where: { id: input.productId },
    include: { brand: { select: { id: true, ownerAccountId: true, name: true } } }
  });
  if (!current) throw new AppError("Product submission not found", 404, "PRODUCT_SUBMISSION_NOT_FOUND");
  assertStateTransition(current.reviewStatus, input.decision, productTransitionMap, { message: "Invalid status transition" });
  if ((input.decision === "REJECTED" || input.decision === "CHANGES_REQUESTED") && !input.reason?.trim()) {
    throw new AppError("reason is required", 422, "REASON_REQUIRED");
  }

  const updated = await prismaAny.productSubmission.update({
    where: { id: input.productId },
    data: {
      reviewStatus: input.decision,
      reviewedById: input.actorId,
      reviewedAt: new Date(),
      reviewNote: buildReviewNote({
        previous: current.reviewNote,
        note: input.note,
        reason: input.reason,
        proposedCommissionPercent: input.proposedCommissionPercent,
        proposedMarginPercent: input.proposedMarginPercent,
        campaignEligible: input.campaignEligible
      })
    }
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: `PRODUCT_SUBMISSION_${input.decision}`,
    targetType: "ProductSubmission",
    targetId: input.productId,
    oldStatus: current.reviewStatus,
    newStatus: input.decision,
    reason: input.reason ?? null,
    metadata: {
      reason: input.reason ?? null,
      proposedCommissionPercent: input.proposedCommissionPercent ?? null,
      proposedMarginPercent: input.proposedMarginPercent ?? null,
      campaignEligible: input.campaignEligible ?? null
    }
  });

  await createNotification({
    accountId: current.brand.ownerAccountId,
    event: input.decision === "APPROVED" ? NotificationEvent.BRAND_PRODUCT_APPROVED : NotificationEvent.BRAND_PRODUCT_CHANGES_REQUIRED,
    title: input.decision === "APPROVED" ? "Product đã được duyệt" : "Product cần cập nhật",
    content:
      input.decision === "APPROVED"
        ? `Sản phẩm "${current.name}" đã được duyệt để tiếp tục vận hành campaign.`
        : `Sản phẩm "${current.name}" cần cập nhật: ${input.reason ?? "Vui lòng kiểm tra lại thông tin."}`,
    metadata: {
      productSubmissionId: input.productId,
      decision: input.decision
    }
  });

  await createNotificationForBrandMembers({
    brandId: current.brand.id,
    event: input.decision === "APPROVED" ? NotificationEvent.BRAND_PRODUCT_APPROVED : NotificationEvent.BRAND_PRODUCT_CHANGES_REQUIRED,
    title: input.decision === "APPROVED" ? "Product approved" : "Product needs changes",
    content:
      input.decision === "APPROVED"
        ? `Product "${current.name}" was approved for campaign operations.`
        : `Product "${current.name}" needs updates: ${input.reason ?? "Please review the latest feedback."}`,
    metadata: {
      productSubmissionId: input.productId,
      decision: input.decision
    }
  });

  return updated;
}
