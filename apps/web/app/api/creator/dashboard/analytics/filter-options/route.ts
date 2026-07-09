import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { toErrorResponse } from "@/lib/errors";
import { getCreatorAnalyticsFilterOptions } from "@/lib/services/creator-analytics.service";

export async function GET(request: NextRequest) {
  try {
    const account = await requireApprovedCreator(request);
    const { searchParams } = request.nextUrl;
    return ok(
      await getCreatorAnalyticsFilterOptions({
        accountId: account.id,
        from: searchParams.get("from") ?? undefined,
        to: searchParams.get("to") ?? undefined
      })
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
