import { ApplicationStatus, SocialPlatform } from "@prisma/client";
import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { listCreatorApplications } from "@/lib/services/role-upgrade.service";
import { adminCreatorListQuerySchema } from "@/lib/validators/admin-creator";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const statusRaw = request.nextUrl.searchParams.get("status") ?? undefined;
    const query = request.nextUrl.searchParams.get("query") ?? undefined;
    const platformRaw = request.nextUrl.searchParams.get("platform") ?? undefined;
    const contentCategory = request.nextUrl.searchParams.get("contentCategory") ?? undefined;

    const parsed = adminCreatorListQuerySchema.parse({
      status: statusRaw && Object.values(ApplicationStatus).includes(statusRaw as ApplicationStatus) ? (statusRaw as ApplicationStatus) : undefined,
      query,
      platform: platformRaw && Object.values(SocialPlatform).includes(platformRaw as SocialPlatform) ? (platformRaw as SocialPlatform) : undefined,
      contentCategory
    });

    return ok(await listCreatorApplications(parsed.status, parsed.query, parsed.platform, parsed.contentCategory));
  } catch (error) {
    return toErrorResponse(error);
  }
}
