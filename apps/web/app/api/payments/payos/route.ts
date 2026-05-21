import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { toErrorResponse } from "@/lib/errors";
import { assertInternalApiKey } from "@/lib/security";
import { paymentRequestSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    assertInternalApiKey(request);

    const payload = paymentRequestSchema.parse(await request.json());

    return ok({
      provider: "payos",
      orderCode: payload.orderCode,
      paymentUrl: `${process.env.PAYOS_CHECKOUT_BASE_URL ?? "https://pay.payos.vn/web"}/${payload.orderCode}`,
      amountVnd: payload.amountVnd,
      status: "PENDING"
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}