import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { getMyNotifications } from "@/lib/services/notification.service";
import { notificationQuerySchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const account = await requireAuth(request);
    const query = notificationQuerySchema.parse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined
    });
    return ok(await getMyNotifications(account.id, query.limit));
  } catch (error) {
    return toErrorResponse(error);
  }
}
