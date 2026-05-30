import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
    const status = request.nextUrl.searchParams.get("status")?.trim() ?? "";
    const brands = await prisma.brand.findMany({
      where: {
        ...(status === "LOCKED" ? { isLocked: true } : status === "ACTIVE" ? { isLocked: false, status: "ACTIVE" } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { industry: { contains: query, mode: "insensitive" } },
                { contactEmail: { contains: query, mode: "insensitive" } },
                { owner: { email: { contains: query, mode: "insensitive" } } },
                { owner: { displayName: { contains: query, mode: "insensitive" } } }
              ]
            }
          : {})
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            displayName: true,
            campaigns: { select: { id: true } }
          }
        },
        nPointTopupRequests: { select: { amountVnd: true, status: true } },
        campaignRequests: { select: { id: true } },
        _count: { select: { members: true, products: true, campaignRequests: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return ok(
      brands.map((brand) => ({
        id: brand.id,
        status: brand.isLocked ? "locked" : brand.status.toLowerCase(),
        verificationStatus: brand.status === "REJECTED" ? "rejected" : brand.status === "PENDING_VERIFICATION" ? "pending" : brand.reviewedAt ? "verified" : "unverified",
        riskFlag: brand.isLocked || brand.status === "REJECTED",
        brandName: brand.name,
        industry: brand.industry,
        contactEmail: brand.contactEmail,
        campaignCount: brand.owner.campaigns.length + brand._count.campaignRequests,
        memberCount: brand._count.members,
        productCount: brand._count.products,
        transactionTotal: brand.nPointTopupRequests.reduce((sum: number, item) => sum + item.amountVnd, 0),
        account: { email: brand.owner.email, displayName: brand.owner.displayName },
        createdAt: brand.createdAt.toISOString()
      }))
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
