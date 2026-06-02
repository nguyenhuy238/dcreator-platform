import { NextRequest } from "next/server";
import { BrandMemberStatus } from "@prisma/client";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const query = (request.nextUrl.searchParams.get("query") ?? "").trim();
    if (query.length < 1) return ok([]);

    const items = await prisma.account.findMany({
      where: {
        isActive: true,
        ownedBrandMemberships: { some: { status: BrandMemberStatus.ACTIVE } },
        OR: [
          { displayName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } }
        ]
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        displayName: true,
        email: true
      }
    });

    return ok(items);
  } catch (error) {
    return toErrorResponse(error);
  }
}
