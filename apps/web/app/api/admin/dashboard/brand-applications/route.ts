import { ApplicationStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { listBrandApplications } from "@/lib/services/role-upgrade.service";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const statusRaw = request.nextUrl.searchParams.get("status");
    const query = request.nextUrl.searchParams.get("query") ?? undefined;
    const status = statusRaw && Object.values(ApplicationStatus).includes(statusRaw as ApplicationStatus) ? (statusRaw as ApplicationStatus) : undefined;
    return ok(await listBrandApplications({ status, query }));
  } catch (error) {
    return toErrorResponse(error);
  }
}
