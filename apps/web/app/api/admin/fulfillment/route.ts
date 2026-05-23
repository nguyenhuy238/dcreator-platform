import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/errors";
import { createFulfillmentExportRequest, listFulfillmentForAdmin } from "@/lib/services/admin-fulfillment.service";
import { adminCreateFulfillmentSchema, adminFulfillmentListQuerySchema } from "@/lib/validators/admin-fulfillment";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const parsed = adminFulfillmentListQuerySchema.parse({
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      campaignId: request.nextUrl.searchParams.get("campaignId") ?? undefined,
      creatorId: request.nextUrl.searchParams.get("creatorId") ?? undefined,
      brandId: request.nextUrl.searchParams.get("brandId") ?? undefined,
      query: request.nextUrl.searchParams.get("query") ?? undefined
    });
    return ok(await listFulfillmentForAdmin(parsed));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminOps(request);
    const payload = adminCreateFulfillmentSchema.parse(await request.json());
    return ok(
      await createFulfillmentExportRequest({
        actorId: actor.id,
        ...payload
      })
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

