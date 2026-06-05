import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import type { CurrentUser } from "@/lib/auth/current-user";
import { resolveCurrentBrandIdFromMemberships } from "@/lib/auth/brand-context-core";

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

export function resolveCurrentBrandIdForUser(user: CurrentUser, preferredBrandId?: string | null, options?: { allowInvalidPreferredFallback?: boolean }) {
  return resolveCurrentBrandIdFromMemberships({
    brandMemberships: user.brandMemberships,
    activeBrandId: user.activeBrandId,
    preferredBrandId,
    allowInvalidPreferredFallback: options?.allowInvalidPreferredFallback
  });
}
