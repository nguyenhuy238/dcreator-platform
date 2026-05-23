import { PayoutRequestStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { listPayoutRequestsForAdmin } from "@/lib/services/admin-payout.service";
import { adminPayoutListQuerySchema } from "@/lib/validators/admin-payout";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const statusRaw = request.nextUrl.searchParams.get("status") ?? undefined;
    const parsed = adminPayoutListQuerySchema.parse({
      status: statusRaw ?? undefined,
      query: request.nextUrl.searchParams.get("query") ?? undefined
    });
    const status = parsed.status ? (parsed.status as PayoutRequestStatus) : undefined;
    return ok(await listPayoutRequestsForAdmin({ status, query: parsed.query }));
  } catch (error) {
    return toErrorResponse(error);
  }
}

