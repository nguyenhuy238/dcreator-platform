import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import { createNotification, createNotificationForAdminOps } from "@/lib/services/notification.service";
import { sendNotificationSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    await requireAdminOps(request);
    const body = sendNotificationSchema.parse(await request.json());
    if (!body.accountId) {
      await createNotificationForAdminOps({
        event: body.event,
        title: body.title,
        content: body.content,
        metadata: body.metadata
      });
      return ok({ delivered: "ADMIN_OPS_BROADCAST" }, 201);
    }
    return ok(
      await createNotification({
        accountId: body.accountId,
        event: body.event,
        title: body.title,
        content: body.content,
        metadata: body.metadata,
        channels: body.channels
      }),
      201
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
