import { NotificationChannel, NotificationEvent } from "@prisma/client";
import { z } from "zod";

export const notificationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const sendNotificationSchema = z.object({
  accountId: z.string().min(1),
  event: z.nativeEnum(NotificationEvent),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  metadata: z.record(z.string(), z.unknown()).optional(),
  channels: z.array(z.nativeEnum(NotificationChannel)).min(1).max(3).optional()
});
