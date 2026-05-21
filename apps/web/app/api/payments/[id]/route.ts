import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { getPaymentByIdForActor } from "@/lib/services/payment.service";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const actor = await requireAuth(request);
    const { id } = await params;
    const payment = await getPaymentByIdForActor(id, actor);
    return ok(payment);
  } catch (error) {
    return toErrorResponse(error);
  }
}
