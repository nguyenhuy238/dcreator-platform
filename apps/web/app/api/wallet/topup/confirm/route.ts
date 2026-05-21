import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { AppError, toErrorResponse } from "@/lib/errors";
import { confirmTopupPayment, verifyWebhookSignature } from "@/lib/services/wallet.service";
import { topupConfirmSchema } from "@/lib/validators";

const WEBHOOK_SIGNATURE_HEADER = "x-payos-signature";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get(WEBHOOK_SIGNATURE_HEADER);
    if (!signature) {
      throw new AppError("Missing webhook signature", 401, "MISSING_SIGNATURE");
    }
    if (!verifyWebhookSignature(rawBody, signature)) {
      throw new AppError("Invalid webhook signature", 401, "INVALID_SIGNATURE");
    }

    const payload = topupConfirmSchema.parse(JSON.parse(rawBody));
    const result = await confirmTopupPayment(payload, payload);
    return ok(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
