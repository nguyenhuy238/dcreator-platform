import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { toErrorResponse } from "@/lib/errors";
import { listCreatorMarketplaceJobs } from "@/lib/services/creator-dashboard.service";
import { creatorMarketplaceQuerySchema } from "@/lib/validators/creator-dashboard";

export async function GET(request: NextRequest) {
  try {
    const account = await requireApprovedCreator(request);
    const query = creatorMarketplaceQuerySchema.parse({
      category: request.nextUrl.searchParams.get("category") ?? undefined,
      campaignStatus: request.nextUrl.searchParams.get("campaignStatus") ?? undefined,
      minRewardPoints: request.nextUrl.searchParams.get("minRewardPoints") ?? undefined,
      minPayoutVnd: request.nextUrl.searchParams.get("minPayoutVnd") ?? undefined,
      deadlineBefore: request.nextUrl.searchParams.get("deadlineBefore") ?? undefined,
      search: request.nextUrl.searchParams.get("search") ?? undefined
    });
    return ok(await listCreatorMarketplaceJobs(account.id, query));
  } catch (error) {
    return toErrorResponse(error);
  }
}
