import { NextRequest } from "next/server";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { DCREATOR_ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { buildCreatorAnalyticsCsv, type CreatorAnalyticsExportType } from "@/lib/creator-analytics-csv";
import { csvResponse } from "@/lib/csv";
import { AppError, toErrorResponse } from "@/lib/errors";
import { trackDcreatorEvent } from "@/lib/services/analytics-event.service";
import { getCreatorAnalyticsOverview } from "@/lib/services/creator-analytics.service";

const exportTypes = new Set<CreatorAnalyticsExportType>(["campaignPerformance", "funnel", "pendingActions"]);

export async function GET(request: NextRequest) {
  try {
    const account = await requireApprovedCreator(request);
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type") as CreatorAnalyticsExportType | null;
    if (!type || !exportTypes.has(type)) {
      throw new AppError("Invalid export type", 422, "CREATOR_ANALYTICS_EXPORT_TYPE_INVALID");
    }

    const data = await getCreatorAnalyticsOverview({
      accountId: account.id,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      campaignId: searchParams.get("campaignId") ?? undefined
    });
    const csv = buildCreatorAnalyticsCsv(type, data);
    const date = new Date().toISOString().slice(0, 10);
    await trackDcreatorEvent({
      eventName: DCREATOR_ANALYTICS_EVENTS.ANALYTICS_CSV_EXPORTED,
      actorId: account.id,
      accountId: account.id,
      creatorId: account.id,
      campaignId: searchParams.get("campaignId"),
      exportType: type,
      metadata: { scope: "creator", from: searchParams.get("from"), to: searchParams.get("to") }
    });
    return csvResponse(csv, `dcreator-creator-analytics-${type}-${date}.csv`);
  } catch (error) {
    return toErrorResponse(error);
  }
}
