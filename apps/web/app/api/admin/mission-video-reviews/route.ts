import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { listMissionVideoReviewsForAdmin } from "@/lib/services/creator-mission.service";
import { missionVideoReviewAdminQuerySchema } from "@/lib/validators/mission-workflow";

function qp(request: NextRequest, key: string) {
  const value = request.nextUrl.searchParams.get(key);
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const query = missionVideoReviewAdminQuerySchema.parse({
      query: qp(request, "query"),
      campaignId: qp(request, "campaignId"),
      videoReviewStatus: qp(request, "videoReviewStatus"),
      sort: qp(request, "sort"),
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });
    return ok(await listMissionVideoReviewsForAdmin(query));
  } catch (error) {
    return toErrorResponse(error);
  }
}
