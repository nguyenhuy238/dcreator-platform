import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { createRiskFlagByAdmin, listRiskFlags } from "@/lib/services/admin-lifecycle.service";
import { riskCreateSchema } from "@/lib/validators/admin-lifecycle";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const status = request.nextUrl.searchParams.get("status") as "OPEN" | "RESOLVED" | "ESCALATED" | null;
    const targetType = request.nextUrl.searchParams.get("targetType") ?? undefined;
    return ok(await listRiskFlags({ status: status ?? undefined, targetType }));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const payload = riskCreateSchema.parse(await request.json());
    return ok(await createRiskFlagByAdmin(actor.id, actor.role, payload), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
