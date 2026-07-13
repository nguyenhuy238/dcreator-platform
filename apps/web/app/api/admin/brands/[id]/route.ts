import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { requireAnyRole } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { AppError, toErrorResponse } from "@/lib/errors";
import { deleteBrandByAdmin, getBrandDeleteImpact, updateBrandByAdmin } from "@/lib/services/admin-crud.service";
import { adminDeleteEntitySchema, adminUpdateBrandSchema } from "@/lib/validators/admin-crud";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  try {
    await requireAdminOps(request);
    const { id } = await params;
    if (request.nextUrl.searchParams.get("intent") === "delete-impact") {
      const actor = await requireAnyRole(request, [Role.ADMIN]);
      return ok(await getBrandDeleteImpact(actor, id));
    }
    const item = await prisma.brand.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, email: true, displayName: true, campaigns: { select: { id: true } } } },
        members: { select: { id: true, role: true, status: true } },
        campaignRequests: { select: { id: true } },
        products: { select: { id: true } },
        nPointTopupRequests: { select: { amountVnd: true, status: true } }
      }
    });
    if (!item) throw new AppError("Brand not found", 404, "BRAND_NOT_FOUND");
    return ok({
      id: item.id,
      status: item.isLocked ? "locked" : item.status.toLowerCase(),
      verificationStatus: item.status === "REJECTED" ? "rejected" : item.status === "PENDING_VERIFICATION" ? "pending" : item.reviewedAt ? "verified" : "unverified",
      brandName: item.name,
      logoUrl: item.logoUrl,
      industry: item.industry,
      contactName: item.contactName,
      contactPhone: item.contactPhone,
      contactEmail: item.contactEmail,
      legalName: item.legalName,
      taxCode: item.taxCode,
      productCategories: item.productCategories,
      inventoryDescription: item.inventoryDescription,
      businessLicenseUrl: item.businessLicenseUrl,
      rejectReason: item.lockReason,
      reviewNote: null,
      campaignCount: item.owner.campaigns.length + item.campaignRequests.length,
      memberCount: item.members.length,
      productCount: item.products.length,
      transactionTotal: item.nPointTopupRequests.reduce((sum: number, request) => sum + request.amountVnd, 0),
      account: { id: item.owner.id, email: item.owner.email, displayName: item.owner.displayName }
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireAnyRole(request, [Role.ADMIN]);
    const payload = adminUpdateBrandSchema.parse(await request.json());
    return ok(await updateBrandByAdmin(actor, (await params).id, payload));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  const { id } = await params;
  let actor: Awaited<ReturnType<typeof requireAnyRole>> | null = null;
  try {
    actor = await requireAnyRole(request, [Role.ADMIN]);
    const payload = adminDeleteEntitySchema.parse(await request.json());
    return ok(await deleteBrandByAdmin(actor, id, payload));
  } catch (error) {
    if (actor) {
      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          actorRole: actor.role,
          action: "ADMIN_DELETE_FAILED",
          targetType: "Brand",
          targetId: id,
          reason: error instanceof Error ? error.message : "Delete failed"
        }
      }).catch(() => null);
    }
    return toErrorResponse(error);
  }
}
