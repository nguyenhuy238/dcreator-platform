import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { createNotification } from "@/lib/services/notification.service";
import { sendNotificationSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const body = sendNotificationSchema.parse(await request.json());
    return ok(await createNotification(body), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
