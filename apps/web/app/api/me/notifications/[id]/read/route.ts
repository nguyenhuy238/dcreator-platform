import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { markAsRead } from "@/lib/services/notification.service";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const account = await requireAuth(request);
    const { id } = await context.params;
    return ok(await markAsRead(account.id, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
