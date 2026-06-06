import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireRole } from "@/lib/auth/guards";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";
import { toErrorResponse } from "@/lib/errors";
import { createCreatorPayoutRequest } from "@/lib/services/wallet.service";
import { creatorPayoutRequestSchema } from "@/lib/validators/creator-dashboard";

export async function POST(request: NextRequest) {
  try {
    const account = await requireRole(request, DASHBOARD_ACCESS.creator);
    const payload = creatorPayoutRequestSchema.parse(await request.json());
    const data = await createCreatorPayoutRequest(
      account.id,
      payload.amountVnd,
      payload.creatorBankAccountId,
      payload.note,
      payload.idempotencyKey
    );
    return ok(data, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
