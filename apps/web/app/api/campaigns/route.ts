import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { toErrorResponse } from "@/lib/errors";
import { campaignQuerySchema } from "@/lib/validators";
import { listCampaigns } from "@/lib/services/campaign.service";

export async function GET(request: NextRequest) {
  try {
    const parsed = campaignQuerySchema.parse({
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });

    const data = await listCampaigns(parsed);
    return ok(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}