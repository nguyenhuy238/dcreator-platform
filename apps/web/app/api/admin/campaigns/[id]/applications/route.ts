import { NextRequest } from "next/server";
import { MissionLifecycleStatus } from "@prisma/client";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { MISSION_LIFECYCLE_STATUS_SET } from "@/lib/constants/enums";
import { toErrorResponse } from "@/lib/errors";
import { listCampaignApplicationsForAdmin } from "@/lib/services/admin-campaign-application.service";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  try {
    await requireAdminOps(request);
    const { id } = await params;
    const statusRaw = request.nextUrl.searchParams.get("status") ?? undefined;
    const status: MissionLifecycleStatus | undefined =
      statusRaw && MISSION_LIFECYCLE_STATUS_SET.has(statusRaw) ? (statusRaw as MissionLifecycleStatus) : undefined;
    return ok(await listCampaignApplicationsForAdmin({ campaignId: id, status }));
  } catch (error) {
    return toErrorResponse(error);
  }
}
