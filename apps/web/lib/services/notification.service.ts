import { NotificationChannel, NotificationEvent, Prisma, Role } from "@prisma/client";
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
  USER_CONTRIBUTION_SUCCESS: { title: "Đóng góp thành công", content: "Bạn đã đóng góp thành công." },
  USER_RECEIVED_VOUCHER: { title: "Nhận voucher", content: "Bạn vừa nhận được voucher mới." },
  MISSION_ACCEPTED: { title: "Nhận nhiệm vụ", content: "Bạn đã nhận nhiệm vụ thành công." },
  PROOF_SUBMITTED: { title: "Đã nộp minh chứng", content: "Minh chứng của bạn đã được gửi." },
  PROOF_APPROVED: { title: "Minh chứng được duyệt", content: "Minh chứng của bạn đã được phê duyệt." },
  PROOF_REJECTED: { title: "Minh chứng bị từ chối", content: "Minh chứng của bạn đã bị từ chối." },
  MISSION_APPLICATION_APPROVED: { title: "Đơn nhiệm vụ được duyệt", content: "Đơn xin làm nhiệm vụ của bạn đã được duyệt." },
  MISSION_APPLICATION_REJECTED: { title: "Đơn nhiệm vụ bị từ chối", content: "Đơn xin làm nhiệm vụ của bạn đã bị từ chối." },
  CREATOR_MISSION_VIDEO_APPROVED: { title: "Video được duyệt", content: "Video review của bạn đã được duyệt." },
  CREATOR_MISSION_VIDEO_REJECTED: { title: "Video bị từ chối", content: "Video review của bạn đã bị từ chối." },
  CREATOR_MISSION_FINAL_APPROVED: { title: "Nhiệm vụ hoàn thành", content: "Nhiệm vụ của bạn đã được duyệt hoàn thành." },
  CREATOR_MISSION_FINAL_REJECTED: { title: "Bước cuối bị từ chối", content: "Bước hoàn thành của bạn đã bị từ chối." },
  CREATOR_APPLICATION_APPROVED: { title: "Duyệt Creator", content: "Đơn đăng ký Creator đã được duyệt." },
  BRAND_APPLICATION_APPROVED: { title: "Duyệt Brand", content: "Đơn đăng ký Brand đã được duyệt." },
  CAMPAIGN_APPROVED: { title: "Campaign được duyệt", content: "Campaign của bạn đã được duyệt." },
  CAMPAIGN_REJECTED: { title: "Campaign bị từ chối", content: "Campaign của bạn đã bị từ chối." },
  PAYMENT_SUCCESS: { title: "Thanh toán thành công", content: "Giao dịch thanh toán đã thành công." },
  PAYMENT_FAILED: { title: "Thanh toán thất bại", content: "Giao dịch thanh toán thất bại." },
  PAYOUT_REQUESTED: { title: "Yêu cầu payout", content: "Yêu cầu payout đã được tạo." },
  PAYOUT_APPROVED: { title: "Payout được duyệt", content: "Yêu cầu payout đã được phê duyệt." },
  PAYOUT_REJECTED: { title: "Payout bị từ chối", content: "Yêu cầu payout đã bị từ chối." }
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
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
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
      html: `<p>Xin chào ${notification.account.displayName},</p><p>${notification.content}</p>`
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

export async function createNotificationForAdminOps(input: {
  event: NotificationEvent;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  excludeAccountId?: string;
}) {
  const targets = await prisma.account.findMany({
    where: {
      OR: [{ role: Role.ADMIN }, { role: Role.OPS }],
      ...(input.excludeAccountId ? { id: { not: input.excludeAccountId } } : {})
    },
    select: { id: true }
  });

  await Promise.all(
    targets.map((target) =>
      createNotification({
        accountId: target.id,
        event: input.event,
        title: input.title,
        content: input.content,
        metadata: input.metadata
      })
    )
  );
}
