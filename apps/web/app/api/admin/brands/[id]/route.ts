import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { prisma } from "@/lib/db";
import { AppError, toErrorResponse } from "@/lib/errors";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  try {
    await requireAdminOps(request);
    const { id } = await params;
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
