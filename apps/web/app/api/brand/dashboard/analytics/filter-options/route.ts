import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireBrandActor } from "@/lib/auth/brand-guard";
import { toErrorResponse } from "@/lib/errors";
import { getBrandAnalyticsFilterOptions } from "@/lib/services/brand-analytics.service";

export async function GET(request: NextRequest) {
  try {
    const account = await requireBrandActor(request);
    const { searchParams } = request.nextUrl;
    return ok(
      await getBrandAnalyticsFilterOptions({
        brandIds: [account.currentBrandId],
        from: searchParams.get("from") ?? undefined,
        to: searchParams.get("to") ?? undefined
      })
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
