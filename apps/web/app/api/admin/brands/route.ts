import { ApplicationStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { listBrandApplications } from "@/lib/services/role-upgrade.service";
import { adminBrandListQuerySchema } from "@/lib/validators/admin-brand";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const statusRaw = request.nextUrl.searchParams.get("status") ?? undefined;
    const query = request.nextUrl.searchParams.get("query") ?? undefined;
    const parsed = adminBrandListQuerySchema.parse({
      status: statusRaw && Object.values(ApplicationStatus).includes(statusRaw as ApplicationStatus) ? (statusRaw as ApplicationStatus) : undefined,
      query
    });
    return ok(await listBrandApplications(parsed.status, parsed.query));
  } catch (error) {
    return toErrorResponse(error);
  }
}
