import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertApiRateLimit } from "@/lib/api/middleware";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { createPayosPayment } from "@/lib/services/payment.service";
import { payosCreatePaymentSchema } from "@/lib/validators/payment";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAuth(request);
    assertApiRateLimit(request, "payment_create", actor.id);
    const payload = payosCreatePaymentSchema.parse(await request.json());
    const payment = await createPayosPayment(actor, payload);
    return ok(payment, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
