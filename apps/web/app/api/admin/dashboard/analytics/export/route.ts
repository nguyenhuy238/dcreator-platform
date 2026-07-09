import { NextRequest } from "next/server";
import { buildAdminAnalyticsCsv, type AdminAnalyticsExportType } from "@/lib/admin-analytics-csv";
import { csvResponse } from "@/lib/csv";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { AppError, toErrorResponse } from "@/lib/errors";
import { getAdminAnalyticsOverview } from "@/lib/services/admin-analytics.service";

const EXPORT_TYPES = new Set<AdminAnalyticsExportType>(["campaignPerformance", "topCreators", "funnel", "pendingReview"]);

function parseExportType(value: string | null): AdminAnalyticsExportType {
  if (value && EXPORT_TYPES.has(value as AdminAnalyticsExportType)) return value as AdminAnalyticsExportType;
  throw new AppError("Unsupported analytics export type", 422, "ADMIN_ANALYTICS_EXPORT_TYPE_INVALID");
}

function exportFileName(type: AdminAnalyticsExportType) {
  return `dcreator-admin-analytics-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const type = parseExportType(request.nextUrl.searchParams.get("type"));
    const data = await getAdminAnalyticsOverview({
      from: request.nextUrl.searchParams.get("from") ?? undefined,
      to: request.nextUrl.searchParams.get("to") ?? undefined,
      brandId: request.nextUrl.searchParams.get("brandId") ?? undefined,
      campaignId: request.nextUrl.searchParams.get("campaignId") ?? undefined
    });
    return csvResponse(buildAdminAnalyticsCsv(type, data), exportFileName(type));
  } catch (error) {
    return toErrorResponse(error);
  }
}
