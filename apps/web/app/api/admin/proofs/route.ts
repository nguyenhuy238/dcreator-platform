import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAnyRole } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { listAdminProofQueue } from "@/lib/services/mission.service";

export async function GET(request: NextRequest) {
  try {
    await requireAnyRole(request, ["ADMIN", "OPS"]);
    return ok(await listAdminProofQueue());
  } catch (error) {
    return toErrorResponse(error);
  }
}
