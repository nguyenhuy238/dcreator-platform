import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { campaignQuerySchema } from "@/lib/validation";
import { listCampaigns } from "@/lib/services/campaign.service";

export async function GET(request: NextRequest) {
  try {
    const parsed = campaignQuerySchema.parse({
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });

    const data = await listCampaigns(parsed);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
