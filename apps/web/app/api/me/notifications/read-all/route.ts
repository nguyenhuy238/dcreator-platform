import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { markAllAsRead } from "@/lib/services/notification.service";

export async function POST(request: NextRequest) {
  try {
    const account = await requireAuth(request);
    return ok(await markAllAsRead(account.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
