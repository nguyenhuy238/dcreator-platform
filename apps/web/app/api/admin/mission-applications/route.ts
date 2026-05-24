import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { listMissionApplicationsForAdmin } from "@/lib/services/creator-mission.service";
import { missionApplicationAdminQuerySchema } from "@/lib/validators/mission-workflow";

function qp(request: NextRequest, key: string) {
  const value = request.nextUrl.searchParams.get(key);
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const query = missionApplicationAdminQuerySchema.parse({
      query: qp(request, "query"),
      status: qp(request, "status"),
      campaignId: qp(request, "campaignId"),
      sort: qp(request, "sort"),
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });
    return ok(await listMissionApplicationsForAdmin(query));
  } catch (error) {
    return toErrorResponse(error);
  }
}
