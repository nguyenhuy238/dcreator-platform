import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { getAdminReportsSummary } from "@/lib/services/admin-reports.service";
import { adminReportPeriodSchema } from "@/lib/validators/admin-reports";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const parsed = adminReportPeriodSchema.parse({
      period: request.nextUrl.searchParams.get("period") ?? "7d"
    });
    return ok(await getAdminReportsSummary(parsed.period));
  } catch (error) {
    return toErrorResponse(error);
  }
}

