import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { getAdminAnalyticsOverview } from "@/lib/services/admin-analytics.service";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    return ok(
      await getAdminAnalyticsOverview({
        from: request.nextUrl.searchParams.get("from") ?? undefined,
        to: request.nextUrl.searchParams.get("to") ?? undefined,
        brandId: request.nextUrl.searchParams.get("brandId") ?? undefined,
        campaignId: request.nextUrl.searchParams.get("campaignId") ?? undefined
      })
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
