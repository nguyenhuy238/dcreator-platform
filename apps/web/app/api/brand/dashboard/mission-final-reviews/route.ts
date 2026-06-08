import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireBrandActor } from "@/lib/auth/brand-guard";
import { toErrorResponse } from "@/lib/errors";
import { listMissionFinalReviewsForBrand } from "@/lib/services/creator-mission.service";
import { missionFinalReviewAdminQuerySchema } from "@/lib/validators/mission-workflow";

function qp(request: NextRequest, key: string) {
  const value = request.nextUrl.searchParams.get(key);
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const account = await requireBrandActor(request);
    const query = missionFinalReviewAdminQuerySchema.parse({
      query: qp(request, "query"),
      campaignId: qp(request, "campaignId"),
      campaign: qp(request, "campaign"),
      productReceiveOption: qp(request, "productReceiveOption"),
      reimbursementStatus: qp(request, "reimbursementStatus"),
      publishStatus: qp(request, "publishStatus"),
      sort: qp(request, "sort"),
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });
    return ok(await listMissionFinalReviewsForBrand(account.id, query));
  } catch (error) {
    return toErrorResponse(error);
  }
}
