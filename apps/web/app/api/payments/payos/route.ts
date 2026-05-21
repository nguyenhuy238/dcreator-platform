import { NextRequest, NextResponse } from "next/server";
import { paymentRequestSchema } from "@/lib/validation";
import { toErrorResponse } from "@/lib/errors";
import { assertInternalApiKey } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    assertInternalApiKey(request);

    const payload = paymentRequestSchema.parse(await request.json());

    return NextResponse.json({
      success: true,
      data: {
        provider: "payos",
        orderCode: payload.orderCode,
        paymentUrl: `${process.env.PAYOS_CHECKOUT_BASE_URL ?? "https://pay.payos.vn/web"}/${payload.orderCode}`,
        amountVnd: payload.amountVnd,
        status: "PENDING"
      }
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
