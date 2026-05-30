import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { invalidateCurrentUserCache } from "@/lib/auth/current-user";
import { requireAuth } from "@/lib/auth/guard";
import { getCurrentSessionFromRequest } from "@/lib/auth/session";
import { toErrorResponse } from "@/lib/errors";
import { applyCreator, getMyCreatorApplication, updateCreatorApplication } from "@/lib/services/role-upgrade.service";
import { creatorApplicationSchema } from "@/lib/validators/role-upgrade";

export async function GET(request: NextRequest) {
  try {
    const account = await requireAuth(request);
    return ok(await getMyCreatorApplication(account.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const account = await requireAuth(request);
    const session = await getCurrentSessionFromRequest(request);
    const payload = creatorApplicationSchema.parse(await request.json());
    const created = await applyCreator(account.id, payload);
    if (session?.sid) invalidateCurrentUserCache(session.sid);
    return ok(created, 201);
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
    const payload = creatorApplicationSchema.parse(body);
    const updated = await updateCreatorApplication(account.id, applicationId, payload);
    if (session?.sid) invalidateCurrentUserCache(session.sid);
    return ok(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}
