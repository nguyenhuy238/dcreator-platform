import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAnyRole } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { createCreatorPayoutRequest } from "@/lib/services/wallet.service";
import { payoutRequestSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const account = await requireAnyRole(request, ["CREATOR", "ADMIN", "OPS"]);
    const payload = payoutRequestSchema.parse(await request.json());
    const data = await createCreatorPayoutRequest(
      account.id,
      payload.amountVnd,
      payload.note,
      payload.idempotencyKey
    );
    return ok(data, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
