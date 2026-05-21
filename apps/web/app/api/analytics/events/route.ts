import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { getAuthIfAny } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { trackAnalyticsEvent } from "@/lib/services/analytics.service";
import { analyticsEventSchema } from "@/lib/validators/analytics";

export async function POST(request: NextRequest) {
  try {
    const account = await getAuthIfAny(request);
    const payload = analyticsEventSchema.parse(await request.json());
    const event = await trackAnalyticsEvent({
      ...payload,
      userId: account?.id ?? null
    });
    return ok({ id: event.id }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
