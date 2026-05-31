import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/guard";
import { BRAND_ID_QUERY_KEY, CURRENT_BRAND_COOKIE, resolveCurrentBrandIdForUser } from "@/lib/auth/brand-context";
import { AppError, toErrorResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const store = await cookies();
    const cookieBrandId = store.get(CURRENT_BRAND_COOKIE)?.value ?? null;
    const currentBrandId = resolveCurrentBrandIdForUser(user, cookieBrandId);
    return ok({
      currentBrandId,
      brands: user.brandMemberships
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const payload = (await request.json()) as { brandId?: string };
    const brandId = (payload.brandId ?? "").trim();
    if (!brandId) {
      throw new AppError("brandId is required", 422, "BRAND_ID_REQUIRED");
    }
    const currentBrandId = resolveCurrentBrandIdForUser(user, brandId);
    const response = ok({ currentBrandId });
    response.cookies.set(CURRENT_BRAND_COOKIE, currentBrandId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    response.headers.set("x-brand-id", currentBrandId);
    response.headers.set("x-brand-key", BRAND_ID_QUERY_KEY);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
