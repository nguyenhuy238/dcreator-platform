import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { toErrorResponse } from "@/lib/errors";
import { createCreatorPayoutWithKyc, getCreatorPayoutData } from "@/lib/services/creator-dashboard.service";
import { creatorPayoutRequestSchema } from "@/lib/validators/creator-dashboard";

export async function GET(request: NextRequest) {
  try {
    const account = await requireApprovedCreator(request);
    return ok(await getCreatorPayoutData(account.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const account = await requireApprovedCreator(request);
    const payload = creatorPayoutRequestSchema.parse(await request.json());
    return ok(
      await createCreatorPayoutWithKyc(account.id, payload.amountVnd, payload.note, payload.idempotencyKey),
      201
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
