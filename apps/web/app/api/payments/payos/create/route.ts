import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { createPayosPayment } from "@/lib/services/payment.service";
import { payosCreatePaymentSchema } from "@/lib/validators/payment";

export async function POST(request: NextRequest) {
  try {
    const account = await requireAuth(request);
    const payload = payosCreatePaymentSchema.parse(await request.json());
    const payment = await createPayosPayment(account, payload);
    return ok(payment, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
