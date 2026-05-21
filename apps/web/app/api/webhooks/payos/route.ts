import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { AppError, toErrorResponse } from "@/lib/errors";
import { handlePayosWebhook, verifyPayosWebhookSignature } from "@/lib/services/payment.service";
import { payosWebhookSchema } from "@/lib/validators/payment";

const WEBHOOK_SIGNATURE_HEADER = "x-payos-signature";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get(WEBHOOK_SIGNATURE_HEADER);
    if (!signature) throw new AppError("Missing webhook signature", 401, "MISSING_SIGNATURE");
    if (!verifyPayosWebhookSignature(rawBody, signature)) {
      throw new AppError("Invalid webhook signature", 401, "INVALID_SIGNATURE");
    }

    const payload = payosWebhookSchema.parse(JSON.parse(rawBody));
    const result = await handlePayosWebhook(payload, payload);
    return ok(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
