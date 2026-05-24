import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireBrandActor } from "@/lib/auth/brand-guard";
import { toErrorResponse } from "@/lib/errors";
import { listMissionHistoryForBrand } from "@/lib/services/creator-mission.service";
import { missionHistoryQuerySchema } from "@/lib/validators/mission-workflow";

function qp(request: NextRequest, key: string) {
  const value = request.nextUrl.searchParams.get(key);
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const account = await requireBrandActor(request);
    const query = missionHistoryQuerySchema.parse({
      accountId: qp(request, "accountId"),
      query: qp(request, "query"),
      campaign: qp(request, "campaign"),
      status: qp(request, "status"),
      videoReviewStatus: qp(request, "videoReviewStatus"),
      publishStatus: qp(request, "publishStatus"),
      productReceiveOption: qp(request, "productReceiveOption"),
      productStatus: qp(request, "productStatus"),
      reimbursementStatus: qp(request, "reimbursementStatus"),
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });
    return ok(await listMissionHistoryForBrand(account.id, query));
  } catch (error) {
    return toErrorResponse(error);
  }
}
