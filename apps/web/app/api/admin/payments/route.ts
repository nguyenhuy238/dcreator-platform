import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { listAdminPayments } from "@/lib/services/payment.service";
import { adminPaymentQuerySchema } from "@/lib/validators/payment";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = adminPaymentQuerySchema.parse({
      ...query,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined
    });
    const data = await listAdminPayments(parsed);
    return ok(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
