import type { NextRequest } from "next/server";
import { getCookieCurrentBrandId, getRequestedBrandId, resolveCurrentBrandIdForUser } from "@/lib/auth/brand-context";
import { requireAuth } from "@/lib/auth/guard";
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
  return {
    ...user,
    currentBrandId,
    currentBrandRole: membership.role
  };
}
