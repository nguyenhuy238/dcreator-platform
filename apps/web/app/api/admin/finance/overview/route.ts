import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { getFinanceOverviewForAdmin } from "@/lib/services/admin-payout.service";

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request);
    return ok(await getFinanceOverviewForAdmin());
  } catch (error) {
    return toErrorResponse(error);
  }
}

