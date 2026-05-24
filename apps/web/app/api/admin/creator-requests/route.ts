import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { listCreatorApplications } from "@/lib/services/role-upgrade.service";
import { adminCreatorListQuerySchema } from "@/lib/validators/admin-creator";

const APPLICATION_STATUSES = ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "NEEDS_REVISION"] as const;
const SOCIAL_PLATFORMS = ["TIKTOK", "INSTAGRAM", "YOUTUBE", "FACEBOOK", "OTHER"] as const;

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const statusRaw = request.nextUrl.searchParams.get("status") ?? undefined;
    const query = request.nextUrl.searchParams.get("query") ?? undefined;
    const platformRaw = request.nextUrl.searchParams.get("platform") ?? undefined;
    const contentCategory = request.nextUrl.searchParams.get("contentCategory") ?? undefined;
    const sort = request.nextUrl.searchParams.get("sort") ?? undefined;

    const parsed = adminCreatorListQuerySchema.parse({
      status: statusRaw && APPLICATION_STATUSES.includes(statusRaw as (typeof APPLICATION_STATUSES)[number]) ? statusRaw : undefined,
      query,
      platform: platformRaw && SOCIAL_PLATFORMS.includes(platformRaw as (typeof SOCIAL_PLATFORMS)[number]) ? platformRaw : undefined,
      contentCategory,
      sort
    });
    return ok(await listCreatorApplications(parsed));
  } catch (error) {
    return toErrorResponse(error);
  }
}
