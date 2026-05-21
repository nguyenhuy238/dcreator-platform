import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { toErrorResponse } from "@/lib/errors";
import { getCreatorCommission } from "@/lib/services/creator-dashboard.service";

export async function GET(request: NextRequest) {
  try {
    const account = await requireApprovedCreator(request);
    return ok(await getCreatorCommission(account.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
