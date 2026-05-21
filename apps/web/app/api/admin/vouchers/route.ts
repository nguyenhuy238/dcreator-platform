import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAnyRole } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { listAdminVouchers } from "@/lib/services/voucher.service";
import { voucherAdminQuerySchema } from "@/lib/validators";

function optionalQueryParam(request: NextRequest, key: string) {
  const value = request.nextUrl.searchParams.get(key);
  if (!value) return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export async function GET(request: NextRequest) {
  try {
    await requireAnyRole(request, ["ADMIN", "OPS"]);
    const parsed = voucherAdminQuerySchema.parse({
      code: optionalQueryParam(request, "code"),
      user: optionalQueryParam(request, "user"),
      campaign: optionalQueryParam(request, "campaign"),
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });
    return ok(await listAdminVouchers(parsed));
  } catch (error) {
    return toErrorResponse(error);
  }
}
