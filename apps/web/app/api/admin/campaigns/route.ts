import { CampaignStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { listCampaignsForAdmin } from "@/lib/services/admin-campaign-review.service";
import { adminCampaignListQuerySchema } from "@/lib/validators/admin-campaign";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const statusRaw = request.nextUrl.searchParams.get("status") ?? undefined;
    const query = request.nextUrl.searchParams.get("query") ?? undefined;
    const parsed = adminCampaignListQuerySchema.parse({
      status: statusRaw && Object.values(CampaignStatus).includes(statusRaw as CampaignStatus) ? (statusRaw as CampaignStatus) : undefined,
      query
    });
    return ok(await listCampaignsForAdmin({ status: parsed.status, query: parsed.query }));
  } catch (error) {
    return toErrorResponse(error);
  }
}
