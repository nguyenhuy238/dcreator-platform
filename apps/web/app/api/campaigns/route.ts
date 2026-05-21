import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { toErrorResponse } from "@/lib/errors";
import { campaignQuerySchema } from "@/lib/validators";
import { listCampaigns } from "@/lib/services/campaign.service";

export async function GET(request: NextRequest) {
  try {
    const parsed = campaignQuerySchema.parse({
      search: request.nextUrl.searchParams.get("search") ?? undefined,
      type: request.nextUrl.searchParams.get("type") ?? undefined,
      category: request.nextUrl.searchParams.get("category") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      rewardAvailable: request.nextUrl.searchParams.get("rewardAvailable") ?? undefined,
      sort: request.nextUrl.searchParams.get("sort") ?? undefined,
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });

    const data = await listCampaigns(parsed);
    return ok(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
