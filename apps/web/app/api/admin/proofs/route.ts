import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth/guards";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";
import { toErrorResponse } from "@/lib/errors";
import { listAdminProofQueue } from "@/lib/services/mission.service";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, DASHBOARD_ACCESS.admin);
    return ok(await listAdminProofQueue());
  } catch (error) {
    return toErrorResponse(error);
  }
}
