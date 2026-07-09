import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { getAdminAnalyticsFilterOptions } from "@/lib/services/admin-analytics.service";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    return ok(
      await getAdminAnalyticsFilterOptions({
        from: request.nextUrl.searchParams.get("from") ?? undefined,
        to: request.nextUrl.searchParams.get("to") ?? undefined
      })
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
