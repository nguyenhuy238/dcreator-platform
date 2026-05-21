import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { createTopupPayment } from "@/lib/services/wallet.service";
import { topupCreatePaymentSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const account = await requireAuth(request);
    const payload = topupCreatePaymentSchema.parse(await request.json());
    const payment = await createTopupPayment(account.id, payload.amountVnd, payload.idempotencyKey);

    return ok({
      paymentId: payment.id,
      orderCode: payment.orderCode,
      amountVnd: payment.requestedAmountVnd,
      creditedPoints: payment.creditedPoints,
      status: payment.status,
      paymentUrl: `${process.env.PAYOS_CHECKOUT_BASE_URL ?? "https://pay.payos.vn/web"}/${payment.orderCode}`
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
