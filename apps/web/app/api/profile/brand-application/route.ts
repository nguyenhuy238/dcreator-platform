import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { CURRENT_BRAND_COOKIE } from "@/lib/auth/brand-context";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { invalidateCurrentUserCache } from "@/lib/auth/current-user";
import { requireAuth } from "@/lib/auth/guard";
import { getCurrentSessionFromRequest } from "@/lib/auth/session";
import { toErrorResponse } from "@/lib/errors";
import { applyBrand, updateBrandApplication } from "@/lib/services/role-upgrade.service";
import { brandApplicationSchema } from "@/lib/validators/role-upgrade";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const account = await requireAuth(request);
    const session = await getCurrentSessionFromRequest(request);
    const payload = brandApplicationSchema.parse(await request.json());
    const created = await applyBrand(account.id, payload);
    if (session?.sid) invalidateCurrentUserCache(session.sid);
    const response = ok(created, 201);
    response.cookies.set(CURRENT_BRAND_COOKIE, created.brand.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const account = await requireAuth(request);
    const session = await getCurrentSessionFromRequest(request);
    const body = await request.json();
    const applicationId = String(body.applicationId ?? "");
    const payload = brandApplicationSchema.parse(body);
    const updated = await updateBrandApplication(account.id, applicationId, payload);
    if (session?.sid) invalidateCurrentUserCache(session.sid);
    return ok(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}
