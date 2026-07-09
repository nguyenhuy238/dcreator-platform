import { NextRequest } from "next/server";
import { buildBrandAnalyticsCsv, type BrandAnalyticsExportType } from "@/lib/brand-analytics-csv";
import { requireBrandActor } from "@/lib/auth/brand-guard";
import { csvResponse } from "@/lib/csv";
import { AppError, toErrorResponse } from "@/lib/errors";
import { getBrandAnalyticsOverview } from "@/lib/services/brand-analytics.service";

const exportTypes = new Set<BrandAnalyticsExportType>(["campaignPerformance", "creatorPerformance", "funnel", "pendingReview"]);

export async function GET(request: NextRequest) {
  try {
    const account = await requireBrandActor(request);
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type") as BrandAnalyticsExportType | null;
    if (!type || !exportTypes.has(type)) {
      throw new AppError("Invalid export type", 422, "BRAND_ANALYTICS_EXPORT_TYPE_INVALID");
    }

    const data = await getBrandAnalyticsOverview({
      brandIds: [account.currentBrandId],
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      campaignId: searchParams.get("campaignId") ?? undefined
    });
    const csv = buildBrandAnalyticsCsv(type, data);
    const date = new Date().toISOString().slice(0, 10);

    return csvResponse(csv, `dcreator-brand-analytics-${type}-${date}.csv`);
  } catch (error) {
    return toErrorResponse(error);
  }
}
