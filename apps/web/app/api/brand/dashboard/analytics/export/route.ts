import { NextRequest } from "next/server";
import { buildBrandAnalyticsCsv, type BrandAnalyticsExportType } from "@/lib/brand-analytics-csv";
import { DCREATOR_ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { requireBrandActor } from "@/lib/auth/brand-guard";
import { csvResponse } from "@/lib/csv";
import { AppError, toErrorResponse } from "@/lib/errors";
import { trackDcreatorEvent } from "@/lib/services/analytics-event.service";
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
    await trackDcreatorEvent({
      eventName: DCREATOR_ANALYTICS_EVENTS.ANALYTICS_CSV_EXPORTED,
      actorId: account.id,
      accountId: account.id,
      brandId: account.currentBrandId,
      campaignId: searchParams.get("campaignId"),
      exportType: type,
      metadata: { scope: "brand", from: searchParams.get("from"), to: searchParams.get("to") }
    });

    return csvResponse(csv, `dcreator-brand-analytics-${type}-${date}.csv`);
  } catch (error) {
    return toErrorResponse(error);
  }
}
