import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { AppError } from "@/lib/errors";
import type { CurrentUser } from "@/lib/auth/current-user";

export const CURRENT_BRAND_COOKIE = "dcreator_current_brand_id";
export const BRAND_ID_QUERY_KEY = "brandId";
export const BRAND_ID_HEADER = "x-brand-id";

export function getRequestedBrandId(request?: NextRequest) {
  if (!request) return null;
  return request.nextUrl.searchParams.get(BRAND_ID_QUERY_KEY) ?? request.headers.get(BRAND_ID_HEADER) ?? null;
}

export async function getCookieCurrentBrandId() {
  const store = await cookies();
  return store.get(CURRENT_BRAND_COOKIE)?.value ?? null;
}

export function resolveCurrentBrandIdForUser(user: CurrentUser, preferredBrandId?: string | null) {
  if (user.brandMemberships.length === 0) {
    throw new AppError("Bạn chưa thuộc Brand nào. Vui lòng tạo Brand mới.", 403, "BRAND_MEMBERSHIP_REQUIRED");
  }

  if (preferredBrandId) {
    const canAccess = user.brandMemberships.some((membership) => membership.id === preferredBrandId);
    if (!canAccess) {
      throw new AppError("Bạn không có quyền truy cập Brand này.", 403, "BRAND_FORBIDDEN");
    }
    return preferredBrandId;
  }

  return user.activeBrandId ?? user.brandMemberships[0]!.id;
}
