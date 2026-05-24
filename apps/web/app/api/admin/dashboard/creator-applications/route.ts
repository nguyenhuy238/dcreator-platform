import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { listCreatorApplications } from "@/lib/services/role-upgrade.service";

const APPLICATION_STATUSES = ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "NEEDS_REVISION"] as const;
type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const statusRaw = request.nextUrl.searchParams.get("status");
    const query = request.nextUrl.searchParams.get("query") ?? undefined;
    const status: ApplicationStatus | undefined =
      statusRaw && APPLICATION_STATUSES.includes(statusRaw as ApplicationStatus)
        ? (statusRaw as ApplicationStatus)
        : undefined;
    return ok(await listCreatorApplications({ status, query }));
  } catch (error) {
    return toErrorResponse(error);
  }
}
