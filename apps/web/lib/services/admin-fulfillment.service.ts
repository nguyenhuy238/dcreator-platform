import { FulfillmentStatus, InventoryStockStatus, NotificationEvent } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getBrandDisplayName } from "@/lib/display-identity";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/services/audit-log.service";
import { createNotification, createNotificationForAdminOps } from "@/lib/services/notification.service";

type OpsStatus = "pending" | "preparing" | "shipped" | "delivered" | "failed" | "cancelled";
type FulfillmentMethod = "CREATOR_SELF_BUY_REFUND" | "CREATOR_DEPOSIT" | "BRAND_WAREHOUSE_SHIP";
type PaymentStatus = "NONE" | "DEPOSIT_PENDING" | "DEPOSIT_PAID" | "REFUND_PENDING" | "REFUNDED";

type OpsMeta = {
  opsStatus: OpsStatus;
  trackingCode?: string;
  opsNote?: string;
  fulfillmentMethod?: FulfillmentMethod;
  paymentStatus?: PaymentStatus;
  failureReason?: string;
  history?: Array<{ at: string; by: string; status: OpsStatus; note?: string }>;
};

function toDbStatus(status: OpsStatus): FulfillmentStatus {
  if (status === "pending") return "PENDING";
  if (status === "preparing" || status === "shipped") return "PROCESSING";
  if (status === "delivered") return "COMPLETED";
  return "FAILED";
}

function parseMeta(order: { status: FulfillmentStatus; failureReason: string | null }): OpsMeta {
  const fallbackStatus: OpsStatus = order.status === "PENDING" ? "pending" : order.status === "PROCESSING" ? "preparing" : order.status === "COMPLETED" ? "delivered" : "failed";
  if (!order.failureReason) return { opsStatus: fallbackStatus };
  try {
    const parsed = JSON.parse(order.failureReason) as OpsMeta;
    return { ...parsed, opsStatus: parsed.opsStatus ?? fallbackStatus };
  } catch {
    return { opsStatus: fallbackStatus, failureReason: order.failureReason };
  }
}

function stringifyMeta(meta: OpsMeta) {
  return JSON.stringify(meta);
}

function matchesStatus(status: OpsStatus, dbStatus: FulfillmentStatus, meta: OpsMeta) {
  if (status === "pending") return dbStatus === "PENDING";
  if (status === "preparing") return dbStatus === "PROCESSING" && meta.opsStatus !== "shipped";
  if (status === "shipped") return dbStatus === "PROCESSING" && meta.opsStatus === "shipped";
  if (status === "delivered") return dbStatus === "COMPLETED";
  if (status === "cancelled") return dbStatus === "FAILED" && meta.opsStatus === "cancelled";
  return dbStatus === "FAILED" && meta.opsStatus !== "cancelled";
}

async function getBrandsByOwnerAccountId(ownerAccountIds: string[]) {
  const brands = ownerAccountIds.length
    ? await prisma.brand.findMany({
        where: { ownerAccountId: { in: [...new Set(ownerAccountIds)] } },
        orderBy: { updatedAt: "desc" },
        select: { ownerAccountId: true, name: true, legalName: true }
      })
    : [];
  const brandByOwnerAccountId = new Map<string, (typeof brands)[number]>();
  for (const brand of brands) {
    if (!brandByOwnerAccountId.has(brand.ownerAccountId)) brandByOwnerAccountId.set(brand.ownerAccountId, brand);
  }
  return brandByOwnerAccountId;
}

function mapFulfillmentCampaignBrand<T extends { campaign?: { brand?: { id: string; displayName: string } | null } | null }>(
  row: T,
  brandByOwnerAccountId: Map<string, { name: string; legalName: string | null }>
) {
  if (!row.campaign?.brand) return row;
  return {
    ...row,
    campaign: {
      ...row.campaign,
      brand: {
        ...row.campaign.brand,
        ownerDisplayName: row.campaign.brand.displayName,
        displayName: getBrandDisplayName({ brand: brandByOwnerAccountId.get(row.campaign.brand.id) ?? null })
      }
    }
  };
}

export async function listFulfillmentForAdmin(input: {
  status?: OpsStatus;
  campaignId?: string;
  creatorId?: string;
  brandId?: string;
  query?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  const rows = await prismaAny.fulfillmentOrder.findMany({
    where: {
      ...(input.campaignId ? { campaignId: input.campaignId } : {}),
      ...(input.creatorId ? { creatorAccountId: input.creatorId } : {}),
      ...(input.brandId ? { campaign: { brandId: input.brandId } } : {}),
      ...(input.query
        ? {
            OR: [
              { recipientName: { contains: input.query, mode: "insensitive" } },
              { recipientPhone: { contains: input.query, mode: "insensitive" } },
              { shippingAddress: { contains: input.query, mode: "insensitive" } },
              { campaign: { title: { contains: input.query, mode: "insensitive" } } },
              { creatorAccount: { displayName: { contains: input.query, mode: "insensitive" } } },
              { inventoryBatch: { productSubmission: { name: { contains: input.query, mode: "insensitive" } } } }
            ]
          }
        : {})
    },
    orderBy: { updatedAt: "asc" },
    include: {
      campaign: { select: { id: true, title: true, brandId: true, brand: { select: { id: true, displayName: true, email: true } } } },
      creatorAccount: { select: { id: true, displayName: true, email: true } },
      inventoryBatch: {
        select: {
          id: true,
          batchCode: true,
          quantityTotal: true,
          quantityReserved: true,
          quantityRemaining: true,
          stockStatus: true,
          productSubmission: { select: { id: true, name: true, brand: { select: { id: true, name: true } } } }
        }
      }
    }
  });

  const brandByOwnerAccountId = await getBrandsByOwnerAccountId(rows.map((row: { campaign: { brand: { id: string } } | null }) => row.campaign?.brand.id).filter(Boolean));
  const mapped = rows.map((row: { status: FulfillmentStatus; failureReason: string | null; campaign?: { brand?: { id: string; displayName: string } | null } | null }) =>
    mapFulfillmentCampaignBrand({ ...row, opsMeta: parseMeta(row) }, brandByOwnerAccountId)
  );
  if (!input.status) return mapped;
  return mapped.filter((item: { status: FulfillmentStatus; opsMeta: OpsMeta }) => matchesStatus(input.status as OpsStatus, item.status, item.opsMeta));
}

export async function getFulfillmentDetailForAdmin(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  const item = await prismaAny.fulfillmentOrder.findUnique({
    where: { id },
    include: {
      campaign: { select: { id: true, title: true, brandId: true, brand: { select: { id: true, displayName: true, email: true } } } },
      creatorAccount: { select: { id: true, displayName: true, email: true } },
      inventoryBatch: {
        include: {
          productSubmission: { select: { id: true, name: true, sku: true, unitPriceVnd: true, brand: { select: { id: true, name: true } } } }
        }
      }
    }
  });
  if (!item) throw new AppError("Fulfillment order not found", 404, "FULFILLMENT_NOT_FOUND");
  const brandByOwnerAccountId = await getBrandsByOwnerAccountId(item.campaign?.brand?.id ? [item.campaign.brand.id] : []);
  return mapFulfillmentCampaignBrand({ ...item, opsMeta: parseMeta(item) }, brandByOwnerAccountId);
}

export async function updateFulfillmentByAdmin(input: {
  actorId: string;
  orderId: string;
  status: OpsStatus;
  trackingCode?: string;
  opsNote?: string;
  fulfillmentMethod?: FulfillmentMethod;
  paymentStatus?: PaymentStatus;
  failureReason?: string;
}) {
  const current = await getFulfillmentDetailForAdmin(input.orderId);
  const dbStatus = toDbStatus(input.status);
  const meta = parseMeta(current);
  const nextMeta: OpsMeta = {
    ...meta,
    opsStatus: input.status,
    trackingCode: input.trackingCode ?? meta.trackingCode,
    opsNote: input.opsNote ?? meta.opsNote,
    fulfillmentMethod: input.fulfillmentMethod ?? meta.fulfillmentMethod,
    paymentStatus: input.paymentStatus ?? meta.paymentStatus,
    failureReason: input.failureReason ?? meta.failureReason,
    history: [
      ...(meta.history ?? []),
      { at: new Date().toISOString(), by: input.actorId, status: input.status, note: input.opsNote }
    ]
  };

  const updated = await prisma.fulfillmentOrder.update({
    where: { id: current.id },
    data: {
      status: dbStatus,
      failureReason: stringifyMeta(nextMeta)
    }
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "FULFILLMENT_STATUS_UPDATED",
    targetType: "FulfillmentOrder",
    targetId: current.id,
    oldStatus: meta.opsStatus,
    newStatus: input.status,
    reason: input.failureReason ?? null,
    metadata: { status: input.status, trackingCode: input.trackingCode ?? null, paymentStatus: input.paymentStatus ?? null, fulfillmentMethod: input.fulfillmentMethod ?? null }
  });

  if (current.creatorAccountId) {
    await createNotification({
      accountId: current.creatorAccountId,
      event: NotificationEvent.CAMPAIGN_APPROVED,
      title: "Cập nhật đơn hàng sản phẩm",
      content: `Đơn fulfillment cho campaign "${current.campaign?.title ?? "N/A"}" đã cập nhật trạng thái: ${input.status}.`,
      metadata: { fulfillmentOrderId: current.id, status: input.status, trackingCode: input.trackingCode ?? null }
    });
  }
  if (input.status === "failed" || input.status === "cancelled") {
    await createNotificationForAdminOps({
      event: NotificationEvent.CAMPAIGN_REJECTED,
      title: "Fulfillment issue",
      content: `Fulfillment ${current.id} gặp lỗi trạng thái ${input.status}.`,
      metadata: { fulfillmentOrderId: current.id, status: input.status, failureReason: input.failureReason ?? null },
      excludeAccountId: input.actorId
    });
  }

  return { ...updated, opsMeta: nextMeta };
}

export async function createFulfillmentExportRequest(input: {
  actorId: string;
  campaignId: string;
  creatorAccountId: string;
  inventoryBatchId: string;
  recipientName?: string;
  recipientPhone?: string;
  shippingAddress?: string;
  fulfillmentMethod: FulfillmentMethod;
  paymentStatus?: PaymentStatus;
  opsNote?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  const [campaign, creator, batch] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: input.campaignId }, select: { id: true, title: true } }),
    prisma.account.findUnique({ where: { id: input.creatorAccountId }, select: { id: true, displayName: true } }),
    prismaAny.inventoryBatch.findUnique({ where: { id: input.inventoryBatchId } })
  ]);
  if (!campaign) throw new AppError("Campaign not found", 404, "CAMPAIGN_NOT_FOUND");
  if (!creator) throw new AppError("Creator not found", 404, "CREATOR_NOT_FOUND");
  if (!batch) throw new AppError("Inventory batch not found", 404, "INVENTORY_BATCH_NOT_FOUND");
  if (batch.quantityRemaining <= 0) throw new AppError("Inventory batch is out of stock", 409, "OUT_OF_STOCK");

  const created = await prisma.$transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txAny = tx as any;
    const currentBatch = await txAny.inventoryBatch.findUnique({ where: { id: input.inventoryBatchId } });
    if (!currentBatch || currentBatch.quantityRemaining <= 0) {
      throw new AppError("Inventory batch is out of stock", 409, "OUT_OF_STOCK");
    }
    const nextRemaining = currentBatch.quantityRemaining - 1;
    const nextReserved = currentBatch.quantityReserved + 1;
    const nextStockStatus: InventoryStockStatus = nextRemaining <= 0 ? "OUT_OF_STOCK" : "RESERVED";

    await txAny.inventoryBatch.update({
      where: { id: currentBatch.id },
      data: { quantityRemaining: nextRemaining, quantityReserved: nextReserved, stockStatus: nextStockStatus }
    });

    const meta: OpsMeta = {
      opsStatus: "pending",
      fulfillmentMethod: input.fulfillmentMethod,
      paymentStatus: input.paymentStatus ?? "NONE",
      opsNote: input.opsNote,
      history: [{ at: new Date().toISOString(), by: input.actorId, status: "pending", note: input.opsNote }]
    };
    return tx.fulfillmentOrder.create({
      data: {
        campaignId: input.campaignId,
        creatorAccountId: input.creatorAccountId,
        inventoryBatchId: input.inventoryBatchId,
        recipientName: input.recipientName ?? null,
        recipientPhone: input.recipientPhone ?? null,
        shippingAddress: input.shippingAddress ?? null,
        status: "PENDING",
        failureReason: stringifyMeta(meta)
      }
    });
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "FULFILLMENT_EXPORT_REQUEST_CREATED",
    targetType: "FulfillmentOrder",
    targetId: created.id,
    metadata: {
      campaignId: input.campaignId,
      creatorAccountId: input.creatorAccountId,
      inventoryBatchId: input.inventoryBatchId,
      fulfillmentMethod: input.fulfillmentMethod,
      paymentStatus: input.paymentStatus ?? "NONE"
    }
  });

  await createNotification({
    accountId: input.creatorAccountId,
    event: NotificationEvent.MISSION_ACCEPTED,
    title: "Đã tạo yêu cầu điều phối sản phẩm",
    content: `Admin/Ops đã tạo yêu cầu điều phối sản phẩm cho campaign "${campaign.title}".`,
    metadata: { fulfillmentOrderId: created.id, campaignId: input.campaignId }
  });

  return created;
}
