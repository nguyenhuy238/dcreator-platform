import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { listContentSubmissionsForAdmin } from "@/lib/services/admin-content-review.service";
import { adminContentReviewListQuerySchema } from "@/lib/validators/admin-content-review";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const parsed = adminContentReviewListQuerySchema.parse({
      campaignId: request.nextUrl.searchParams.get("campaignId") ?? undefined,
      creatorId: request.nextUrl.searchParams.get("creatorId") ?? undefined,
      brandId: request.nextUrl.searchParams.get("brandId") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      platform: request.nextUrl.searchParams.get("platform") ?? undefined,
      query: request.nextUrl.searchParams.get("query") ?? undefined
    });
    return ok(await listContentSubmissionsForAdmin(parsed));
  } catch (error) {
    return toErrorResponse(error);
  }
}

