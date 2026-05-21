import { NotificationChannel, NotificationEvent } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getEmailNotificationProvider } from "@/lib/notifications/email-provider";

export type CreateNotificationInput = {
  accountId: string;
  event: NotificationEvent;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  channels?: NotificationChannel[];
};

export const NOTIFICATION_EVENT_TEMPLATES: Record<
  NotificationEvent,
  { title: string; content: string }
> = {
  USER_CONTRIBUTION_SUCCESS: { title: "Dong gop thanh cong", content: "Ban da dong gop thanh cong." },
  USER_RECEIVED_VOUCHER: { title: "Nhan voucher", content: "Ban vua nhan duoc voucher moi." },
  MISSION_ACCEPTED: { title: "Nhan nhiem vu", content: "Ban da nhan nhiem vu thanh cong." },
  PROOF_SUBMITTED: { title: "Da nop proof", content: "Proof cua ban da duoc gui." },
  PROOF_APPROVED: { title: "Proof duoc duyet", content: "Proof cua ban da duoc phe duyet." },
  PROOF_REJECTED: { title: "Proof bi tu choi", content: "Proof cua ban da bi tu choi." },
  CREATOR_APPLICATION_APPROVED: { title: "Duyet creator", content: "Don dang ky creator da duoc duyet." },
  BRAND_APPLICATION_APPROVED: { title: "Duyet brand", content: "Don dang ky brand da duoc duyet." },
  CAMPAIGN_APPROVED: { title: "Campaign duoc duyet", content: "Campaign cua ban da duoc duyet." },
  CAMPAIGN_REJECTED: { title: "Campaign bi tu choi", content: "Campaign cua ban da bi tu choi." },
  PAYMENT_SUCCESS: { title: "Thanh toan thanh cong", content: "Giao dich thanh toan da thanh cong." },
  PAYMENT_FAILED: { title: "Thanh toan that bai", content: "Giao dich thanh toan that bai." },
  PAYOUT_REQUESTED: { title: "Yeu cau payout", content: "Yeu cau payout da duoc tao." },
  PAYOUT_APPROVED: { title: "Payout duoc duyet", content: "Yeu cau payout da duoc phe duyet." },
  PAYOUT_REJECTED: { title: "Payout bi tu choi", content: "Yeu cau payout da bi tu choi." }
};

export async function createNotification(input: CreateNotificationInput) {
  const channels = input.channels?.length ? input.channels : [NotificationChannel.IN_APP];
  const notifications = await prisma.$transaction(
    channels.map((channel) =>
      prisma.notification.create({
        data: {
          accountId: input.accountId,
          event: input.event,
          title: input.title,
          content: input.content,
          metadata: input.metadata,
          channel,
          deliveryStatus: channel === NotificationChannel.IN_APP ? "SENT" : "QUEUED",
          sentAt: channel === NotificationChannel.IN_APP ? new Date() : null
        }
      })
    )
  );

  if (channels.includes(NotificationChannel.EMAIL)) {
    await sendEmailNotification(notifications.find((item) => item.channel === NotificationChannel.EMAIL)?.id);
  }

  return notifications;
}

export async function markAsRead(accountId: string, notificationId: string) {
  const existing = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!existing) throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
  if (existing.accountId !== accountId) throw new AppError("Forbidden", 403, "FORBIDDEN");

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() }
  });
}

export async function getMyNotifications(accountId: string, limit = 20) {
  const [items, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { accountId, channel: "IN_APP" },
      orderBy: { createdAt: "desc" },
      take: limit
    }),
    prisma.notification.count({
      where: { accountId, channel: "IN_APP", isRead: false }
    })
  ]);

  return { items, unreadCount };
}

export async function sendEmailNotification(notificationId?: string) {
  if (!notificationId) return;

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: { account: { select: { email: true, displayName: true } } }
  });

  if (!notification || notification.channel !== "EMAIL") return;

  try {
    await getEmailNotificationProvider().send({
      to: notification.account.email,
      subject: notification.title,
      html: `<p>Xin chao ${notification.account.displayName},</p><p>${notification.content}</p>`
    });

    await prisma.notification.update({
      where: { id: notification.id },
      data: { deliveryStatus: "SENT", sentAt: new Date() }
    });
  } catch (error) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { deliveryStatus: "FAILED" }
    });
    throw error;
  }
}
