import type { NextRequest } from "next/server";
import { getCookieCurrentBrandId, getRequestedBrandId, resolveCurrentBrandIdForUser } from "@/lib/auth/brand-context";
import { requireAuth } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function requireBrandActor(request: NextRequest) {
  const user = await requireAuth(request);
  const cookieBrandId = await getCookieCurrentBrandId();
  const requestedBrandId = getRequestedBrandId(request) ?? cookieBrandId;
  const currentBrandId = resolveCurrentBrandIdForUser(user, requestedBrandId);
  const membership = user.brandMemberships.find((item) => item.id === currentBrandId);
  if (!membership) {
    throw new AppError("Brand membership not found", 403, "BRAND_FORBIDDEN");
  }
  const brand = await prisma.brand.findUnique({
    where: { id: currentBrandId },
    select: { isLocked: true, status: true }
  });
  if (!brand || brand.isLocked || brand.status === "LOCKED" || brand.status === "SUSPENDED") {
    throw new AppError("Brand is locked or suspended", 403, "BRAND_LOCKED");
  }
  return {
    ...user,
    currentBrandId,
    currentBrandRole: membership.role
  };
}
