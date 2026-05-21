import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAnyRole } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { listAdminVouchers } from "@/lib/services/voucher.service";
import { voucherAdminQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    await requireAnyRole(request, ["ADMIN", "OPS"]);
    const parsed = voucherAdminQuerySchema.parse({
      code: request.nextUrl.searchParams.get("code") ?? undefined,
      user: request.nextUrl.searchParams.get("user") ?? undefined,
      campaign: request.nextUrl.searchParams.get("campaign") ?? undefined,
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });
    return ok(await listAdminVouchers(parsed));
  } catch (error) {
    return toErrorResponse(error);
  }
}
