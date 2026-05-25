import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createNotification, createNotificationForAdminOps } from "@/lib/services/notification.service";
import { writeAuditLog } from "@/lib/services/audit-log.service";
import { calculateTopupPoints, ensureWalletByAccountId } from "@/lib/services/wallet.service";
import type { z } from "zod";
import type {
  adminNPointRefundCompleteSchema,
  adminNPointTopupApproveSchema,
  brandNPointRefundInfoSchema,
  brandNPointTopupCreateSchema
} from "@/lib/validators/n-point-topup";

type CreateTopupInput = z.infer<typeof brandNPointTopupCreateSchema>;
type RefundInfoInput = z.infer<typeof brandNPointRefundInfoSchema>;
type ApproveInput = z.infer<typeof adminNPointTopupApproveSchema>;
type RefundCompleteInput = z.infer<typeof adminNPointRefundCompleteSchema>;

async function resolveBrandContext(accountId: string) {
  const ownedBrand = await prisma.brand.findFirst({
    where: { ownerAccountId: accountId },
    select: { id: true, name: true, ownerAccountId: true },
    orderBy: { createdAt: "desc" }
  });
  if (ownedBrand) return ownedBrand;

  const membership = await prisma.brandMember.findFirst({
    where: { accountId },
    include: { brand: { select: { id: true, name: true, ownerAccountId: true } } },
    orderBy: { createdAt: "desc" }
  });
  if (membership) return membership.brand;

  throw new AppError("Bạn chưa được gắn vào Nhãn hàng nào", 403, "BRAND_ACCESS_NOT_CONFIGURED");
}

export async function getBrandNPointWallet(accountId: string) {
  const brand = await resolveBrandContext(accountId);
  const wallet = await ensureWalletByAccountId(brand.ownerAccountId);
  const requests = await prisma.nPointTopupRequest.findMany({
    where: { brandId: brand.id },
    include: {
      requester: { select: { id: true, displayName: true, email: true } },
      reviewedBy: { select: { id: true, displayName: true, email: true } },
      refundProcessedBy: { select: { id: true, displayName: true, email: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return {
    brand,
    currentPoints: wallet.pointsBalance,
    requests
  };
}

export async function createBrandNPointTopupRequest(accountId: string, input: CreateTopupInput) {
  const brand = await resolveBrandContext(accountId);
  const requestedPoints = calculateTopupPoints(input.amountVnd);
  if (requestedPoints <= 0) {
    throw new AppError("Số tiền nạp chưa đủ để quy đổi N-Point", 422, "NPOINT_AMOUNT_TOO_SMALL");
  }

  const request = await prisma.nPointTopupRequest.create({
    data: {
      brandId: brand.id,
      requesterAccountId: accountId,
      amountVnd: input.amountVnd,
      requestedPoints,
      transferNote: input.transferNote,
      bankTransferProofUrl: input.bankTransferProofUrl
    }
  });

  await writeAuditLog({
    actorId: accountId,
    action: "BRAND_NPOINT_TOPUP_REQUEST_CREATED",
    targetType: "NPointTopupRequest",
    targetId: request.id,
    newStatus: request.status,
    metadata: { brandId: brand.id, amountVnd: request.amountVnd, requestedPoints: request.requestedPoints }
  });

  await createNotificationForAdminOps({
    event: "PAYMENT_SUCCESS",
    title: "Có yêu cầu nạp N-Point mới",
    content: `Brand ${brand.name} vừa gửi yêu cầu nạp ${requestedPoints.toLocaleString("vi-VN")} N-Point.`,
    metadata: { requestId: request.id, brandId: brand.id }
  });

  return request;
}

export async function submitBrandNPointRefundInfo(accountId: string, requestId: string, input: RefundInfoInput) {
  const brand = await resolveBrandContext(accountId);
  const current = await prisma.nPointTopupRequest.findUnique({
    where: { id: requestId },
    select: { id: true, brandId: true, status: true, requestedPoints: true, amountVnd: true }
  });
  if (!current || current.brandId !== brand.id) {
    throw new AppError("Không tìm thấy yêu cầu nạp điểm", 404, "NPOINT_REQUEST_NOT_FOUND");
  }
  if (current.status !== "REJECTED") {
    throw new AppError("Yêu cầu này chưa ở trạng thái cần hoàn tiền", 409, "NPOINT_REFUND_NOT_ALLOWED");
  }

  const updated = await prisma.nPointTopupRequest.update({
    where: { id: requestId },
    data: {
      status: "REFUND_INFO_SUBMITTED",
      refundBankName: input.refundBankName,
      refundAccountName: input.refundAccountName,
      refundAccountNumber: input.refundAccountNumber,
      refundRequestNote: input.refundRequestNote ?? null,
      refundSubmittedAt: new Date()
    }
  });

  await writeAuditLog({
    actorId: accountId,
    action: "BRAND_NPOINT_REFUND_INFO_SUBMITTED",
    targetType: "NPointTopupRequest",
    targetId: updated.id,
    oldStatus: "REJECTED",
    newStatus: updated.status
  });

  await createNotificationForAdminOps({
    event: "PAYMENT_SUCCESS",
    title: "Có yêu cầu hoàn tiền N-Point",
    content: `Brand ${brand.name} đã gửi thông tin hoàn tiền cho yêu cầu ${current.requestedPoints.toLocaleString("vi-VN")} N-Point.`,
    metadata: { requestId: updated.id, brandId: brand.id, amountVnd: current.amountVnd }
  });

  return updated;
}

export async function listAdminNPointTopupRequests(status?: "PENDING_ADMIN_REVIEW" | "APPROVED" | "REJECTED" | "REFUND_INFO_SUBMITTED" | "REFUND_COMPLETED") {
  return prisma.nPointTopupRequest.findMany({
    where: status ? { status } : undefined,
    include: {
      brand: { select: { id: true, name: true, ownerAccountId: true } },
      requester: { select: { id: true, displayName: true, email: true } },
      reviewedBy: { select: { id: true, displayName: true, email: true } },
      refundProcessedBy: { select: { id: true, displayName: true, email: true } }
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });
}

async function notifyBrandRequestActors(
  request: { requesterAccountId: string; brand: { ownerAccountId: string } },
  title: string,
  content: string,
  metadata: Record<string, unknown>,
  event: "PAYMENT_SUCCESS" | "PAYMENT_FAILED" = "PAYMENT_SUCCESS"
) {
  const targets = new Set([request.requesterAccountId, request.brand.ownerAccountId]);
  await Promise.all(
    Array.from(targets).map((accountId) =>
      createNotification({
        accountId,
        event,
        title,
        content,
        metadata
      })
    )
  );
}

export async function approveAdminNPointTopupRequest(actorId: string, requestId: string, input: ApproveInput) {
  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.nPointTopupRequest.findUnique({
      where: { id: requestId },
      include: { brand: { select: { id: true, name: true, ownerAccountId: true } } }
    });
    if (!request) throw new AppError("Không tìm thấy yêu cầu nạp điểm", 404, "NPOINT_REQUEST_NOT_FOUND");
    if (request.status !== "PENDING_ADMIN_REVIEW") {
      throw new AppError("Yêu cầu đã được xử lý trước đó", 409, "NPOINT_REQUEST_ALREADY_PROCESSED");
    }

    const wallet = await tx.wallet.upsert({
      where: { userId: request.brand.ownerAccountId },
      create: { userId: request.brand.ownerAccountId },
      update: {}
    });
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { pointsBalance: wallet.pointsBalance + request.requestedPoints }
    });
    const walletTx = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        accountId: request.brand.ownerAccountId,
        type: "TOPUP",
        pointsDelta: request.requestedPoints,
        cashDeltaVnd: request.amountVnd,
        balanceAfterPoints: updatedWallet.pointsBalance,
        balanceAfterCashVnd: updatedWallet.cashBalanceVnd,
        referenceType: "NPOINT_TOPUP_REQUEST",
        referenceId: request.id,
        idempotencyKey: `npoint-topup-${request.id}`
      }
    });

    const updated = await tx.nPointTopupRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        adminDecisionReason: input.note ?? null,
        reviewedById: actorId,
        reviewedAt: new Date(),
        approvedAt: new Date(),
        walletTransactionId: walletTx.id
      },
      include: { brand: { select: { ownerAccountId: true, name: true } } }
    });

    return { request: updated, walletTx };
  });

  await writeAuditLog({
    actorId,
    action: "ADMIN_NPOINT_TOPUP_APPROVED",
    targetType: "NPointTopupRequest",
    targetId: requestId,
    oldStatus: "PENDING_ADMIN_REVIEW",
    newStatus: "APPROVED",
    metadata: { walletTransactionId: result.walletTx.id, requestedPoints: result.request.requestedPoints }
  });

  await notifyBrandRequestActors(
    { requesterAccountId: result.request.requesterAccountId, brand: { ownerAccountId: result.request.brand.ownerAccountId } },
    "Yêu cầu nạp N-Point đã được duyệt",
    `Yêu cầu nạp ${result.request.requestedPoints.toLocaleString("vi-VN")} N-Point đã được duyệt và cộng điểm vào ví Brand.`,
    { requestId: result.request.id, status: result.request.status }
  );

  return result.request;
}

export async function rejectAdminNPointTopupRequest(actorId: string, requestId: string, reason: string) {
  const updated = await prisma.nPointTopupRequest.updateMany({
    where: { id: requestId, status: "PENDING_ADMIN_REVIEW" },
    data: {
      status: "REJECTED",
      adminDecisionReason: reason,
      reviewedById: actorId,
      reviewedAt: new Date()
    }
  });

  if (updated.count === 0) {
    throw new AppError("Yêu cầu đã được xử lý trước đó", 409, "NPOINT_REQUEST_ALREADY_PROCESSED");
  }

  const request = await prisma.nPointTopupRequest.findUnique({
    where: { id: requestId },
    include: { brand: { select: { ownerAccountId: true, name: true } } }
  });
  if (!request) throw new AppError("Không tìm thấy yêu cầu nạp điểm", 404, "NPOINT_REQUEST_NOT_FOUND");

  await writeAuditLog({
    actorId,
    action: "ADMIN_NPOINT_TOPUP_REJECTED",
    targetType: "NPointTopupRequest",
    targetId: request.id,
    oldStatus: "PENDING_ADMIN_REVIEW",
    newStatus: "REJECTED",
    reason
  });

  await notifyBrandRequestActors(
    { requesterAccountId: request.requesterAccountId, brand: { ownerAccountId: request.brand.ownerAccountId } },
    "Yêu cầu nạp N-Point bị từ chối",
    `Yêu cầu nạp N-Point bị từ chối với lý do: ${reason}. Vui lòng gửi thông tin tài khoản để hoàn tiền.`,
    { requestId: request.id, status: request.status, reason },
    "PAYMENT_FAILED"
  );

  return request;
}

export async function completeAdminNPointRefund(actorId: string, requestId: string, input: RefundCompleteInput) {
  const updated = await prisma.nPointTopupRequest.updateMany({
    where: { id: requestId, status: "REFUND_INFO_SUBMITTED" },
    data: {
      status: "REFUND_COMPLETED",
      refundProofUrl: input.refundProofUrl,
      refundProcessedNote: input.refundProcessedNote ?? null,
      refundProcessedById: actorId,
      refundProcessedAt: new Date()
    }
  });
  if (updated.count === 0) {
    throw new AppError("Yêu cầu hoàn tiền chưa sẵn sàng xử lý", 409, "NPOINT_REFUND_NOT_READY");
  }

  const request = await prisma.nPointTopupRequest.findUnique({
    where: { id: requestId },
    include: { brand: { select: { ownerAccountId: true, name: true } } }
  });
  if (!request) throw new AppError("Không tìm thấy yêu cầu nạp điểm", 404, "NPOINT_REQUEST_NOT_FOUND");

  await writeAuditLog({
    actorId,
    action: "ADMIN_NPOINT_REFUND_COMPLETED",
    targetType: "NPointTopupRequest",
    targetId: request.id,
    oldStatus: "REFUND_INFO_SUBMITTED",
    newStatus: "REFUND_COMPLETED"
  });

  await notifyBrandRequestActors(
    { requesterAccountId: request.requesterAccountId, brand: { ownerAccountId: request.brand.ownerAccountId } },
    "Yêu cầu hoàn tiền đã xử lý",
    "Admin đã xử lý hoàn tiền và gửi kèm ảnh biên lai hoàn tiền cho yêu cầu của bạn.",
    { requestId: request.id, status: request.status, refundProofUrl: request.refundProofUrl }
  );

  return request;
}
