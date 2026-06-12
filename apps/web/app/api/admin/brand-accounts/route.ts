import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { getBrandDisplayName } from "@/lib/display-identity";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const query = (request.nextUrl.searchParams.get("query") ?? "").trim();
    if (query.length < 1) return ok([]);

    const brands = await prisma.brand.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { legalName: { contains: query, mode: "insensitive" } },
          { contactEmail: { contains: query, mode: "insensitive" } },
          { owner: { displayName: { contains: query, mode: "insensitive" } } },
          { owner: { email: { contains: query, mode: "insensitive" } } }
        ]
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        legalName: true,
        ownerAccountId: true,
        contactEmail: true,
        owner: { select: { displayName: true, email: true, isActive: true } }
      }
    });

    return ok(
      brands
        .filter((brand) => brand.owner.isActive)
        .map((brand) => ({
          id: brand.ownerAccountId,
          brandId: brand.id,
          displayName: getBrandDisplayName({ brand }),
          ownerDisplayName: brand.owner.displayName,
          email: brand.contactEmail || brand.owner.email
        }))
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
