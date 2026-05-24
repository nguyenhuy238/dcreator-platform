import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { MISSION_LIFECYCLE_STATUS_SET, SOCIAL_PLATFORM_SET } from "@/lib/constants/enums";
import { toErrorResponse } from "@/lib/errors";
import { listCampaignApplicationsForAdmin } from "@/lib/services/admin-campaign-application.service";
import { adminCampaignApplicationListQuerySchema } from "@/lib/validators/admin-campaign-application";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const statusRaw = request.nextUrl.searchParams.get("status") ?? undefined;
    const platformRaw = request.nextUrl.searchParams.get("platform") ?? undefined;
    const followerMinRaw = request.nextUrl.searchParams.get("followerMin") ?? undefined;
    const followerMaxRaw = request.nextUrl.searchParams.get("followerMax") ?? undefined;

    const parsed = adminCampaignApplicationListQuerySchema.parse({
      campaignId: request.nextUrl.searchParams.get("campaignId") ?? undefined,
      brandId: request.nextUrl.searchParams.get("brandId") ?? undefined,
      status: statusRaw && MISSION_LIFECYCLE_STATUS_SET.has(statusRaw) ? statusRaw : undefined,
      platform: platformRaw && SOCIAL_PLATFORM_SET.has(platformRaw) ? platformRaw : undefined,
      followerMin: followerMinRaw ? Number(followerMinRaw) : undefined,
      followerMax: followerMaxRaw ? Number(followerMaxRaw) : undefined,
      query: request.nextUrl.searchParams.get("query") ?? undefined
    });

    return ok(await listCampaignApplicationsForAdmin(parsed));
  } catch (error) {
    return toErrorResponse(error);
  }
}
