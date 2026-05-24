import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { PRODUCT_REVIEW_STATUS_SET } from "@/lib/constants/enums";
import { toErrorResponse } from "@/lib/errors";
import { listProductSubmissionsForAdmin } from "@/lib/services/admin-product-review.service";
import { adminProductListQuerySchema } from "@/lib/validators/admin-product";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const statusRaw = request.nextUrl.searchParams.get("status") ?? undefined;
    const query = request.nextUrl.searchParams.get("query") ?? undefined;
    const parsed = adminProductListQuerySchema.parse({
      status: statusRaw && PRODUCT_REVIEW_STATUS_SET.has(statusRaw) ? statusRaw : undefined,
      query
    });
    return ok(await listProductSubmissionsForAdmin(parsed.status, parsed.query));
  } catch (error) {
    return toErrorResponse(error);
  }
}
