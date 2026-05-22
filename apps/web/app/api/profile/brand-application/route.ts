import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { applyBrand, updateBrandApplication } from "@/lib/services/role-upgrade.service";
import { brandApplicationSchema } from "@/lib/validators/role-upgrade";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const account = await requireAuth(request);
    const payload = brandApplicationSchema.parse(await request.json());
    return ok(await applyBrand(account.id, payload), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const account = await requireAuth(request);
    const body = await request.json();
    const applicationId = String(body.applicationId ?? "");
    const payload = brandApplicationSchema.parse(body);
    return ok(await updateBrandApplication(account.id, applicationId, payload));
  } catch (error) {
    return toErrorResponse(error);
  }
}
