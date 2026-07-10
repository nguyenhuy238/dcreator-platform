import { BrandMemberRole, BrandMemberStatus, NotificationChannel, NotificationEvent, Prisma, Role } from "@prisma/client";
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
  CREATOR_PROFILE_CREATED: { title: "Hồ sơ Creator đã tạo", content: "Hồ sơ Creator của bạn đã được tạo." },
  CREATOR_PROFILE_UPDATED: { title: "Hồ sơ Creator đã cập nhật", content: "Thông tin Creator của bạn đã được cập nhật." },
  CREATOR_REQUEST_APPROVED: { title: "Yêu cầu Creator được duyệt", content: "Yêu cầu Creator của bạn đã được duyệt." },
  CREATOR_REQUEST_CHANGES_REQUIRED: { title: "Yêu cầu Creator cần chỉnh sửa", content: "Yêu cầu Creator của bạn cần bổ sung hoặc chỉnh sửa." },
  CREATOR_REQUEST_REJECTED: { title: "Yêu cầu Creator bị từ chối", content: "Yêu cầu Creator của bạn đã bị từ chối." },
  CREATOR_SOCIAL_LINK_APPROVED: { title: "Kênh mạng xã hội được duyệt", content: "Kênh mạng xã hội của bạn đã được duyệt." },
  CREATOR_SOCIAL_LINK_REJECTED: { title: "Kênh mạng xã hội bị từ chối", content: "Kênh mạng xã hội của bạn đã bị từ chối." },
  CAMPAIGN_REGISTRATION_SUCCESS: { title: "Đăng ký campaign thành công", content: "Đơn đăng ký campaign của bạn đã được ghi nhận." },
  CREATOR_CAMPAIGN_APPLICATION_APPROVED: { title: "Đơn ứng tuyển campaign được duyệt", content: "Đơn ứng tuyển campaign của bạn đã được duyệt." },
  CREATOR_CAMPAIGN_APPLICATION_REJECTED: { title: "Đơn ứng tuyển campaign bị từ chối", content: "Đơn ứng tuyển campaign của bạn đã bị từ chối." },
  CREATOR_TASK_ASSIGNED: { title: "Bạn được assign task", content: "Brand/Admin đã assign task hoặc mission cho bạn." },
  CREATOR_PROOF_SUBMITTED: { title: "Đã nộp proof", content: "Proof của bạn đã được gửi để duyệt." },
  CREATOR_VIDEO_APPROVED: { title: "Video được duyệt", content: "Video hoặc bước review của bạn đã được duyệt." },
  CREATOR_VIDEO_REJECTED: { title: "Video bị từ chối", content: "Video hoặc bước review của bạn đã bị từ chối." },
  CREATOR_FINAL_SUBMISSION_APPROVED: { title: "Final submission được duyệt", content: "Final submission của bạn đã được duyệt." },
  CREATOR_FINAL_SUBMISSION_REJECTED: { title: "Final submission bị từ chối", content: "Final submission của bạn đã bị từ chối." },
  CREATOR_FULFILLMENT_UPDATED: { title: "Cập nhật fulfillment", content: "Trạng thái fulfillment, giao mẫu hoặc sản phẩm đã được cập nhật." },
  BRAND_APPLICATION_APPROVED: { title: "Duyệt Brand", content: "Đơn đăng ký Brand đã được duyệt." },
  BRAND_PROFILE_CREATED: { title: "Hồ sơ Brand đã tạo", content: "Hồ sơ Brand của bạn đã được tạo." },
  BRAND_PROFILE_UPDATED: { title: "Hồ sơ Brand đã cập nhật", content: "Thông tin Brand của bạn đã được cập nhật." },
  BRAND_REQUEST_APPROVED: { title: "Yêu cầu Brand được duyệt", content: "Yêu cầu Brand của bạn đã được duyệt." },
  BRAND_REQUEST_CHANGES_REQUIRED: { title: "Yêu cầu Brand cần chỉnh sửa", content: "Yêu cầu Brand của bạn cần bổ sung hoặc chỉnh sửa." },
  BRAND_REQUEST_REJECTED: { title: "Yêu cầu Brand bị từ chối", content: "Yêu cầu Brand của bạn đã bị từ chối." },
  BRAND_CAMPAIGN_DRAFT_CREATED: { title: "Có campaign draft mới được tạo", content: "Campaign draft mới của Brand đã được tạo." },
  BRAND_CAMPAIGN_SUBMITTED: { title: "Campaign đã submit chờ admin review", content: "Campaign của bạn đã submit và đang chờ admin review." },
  BRAND_CAMPAIGN_APPROVED: { title: "Campaign được duyệt", content: "Campaign của bạn đã được duyệt." },
  BRAND_CAMPAIGN_REJECTED: { title: "Campaign bị từ chối", content: "Campaign của bạn đã bị từ chối." },
  BRAND_CAMPAIGN_CHANGES_REQUIRED: { title: "Campaign cần cập nhật", content: "Campaign của bạn cần cập nhật theo phản hồi review." },
  BRAND_CREATOR_APPLICATION_REVIEW_REQUIRED: { title: "Có creator application cần brand review", content: "Có creator application đang chờ Brand review." },
  BRAND_CREATOR_APPLICATION_PREAPPROVED: { title: "Creator application được admin duyệt sơ bộ", content: "Admin đã duyệt sơ bộ creator application cho Brand." },
  BRAND_CREATOR_APPLICATION_REJECTED: { title: "Creator application bị từ chối", content: "Creator application đã bị từ chối ở bước review." },
  BRAND_CREATOR_TASK_ASSIGNED: { title: "Creator task đã được assign", content: "Creator task cho campaign của Brand đã được assign." },
  BRAND_MEMBER_INVITED: { title: "Brand member được mời", content: "Một thành viên đã được mời vào Brand." },
  BRAND_MEMBER_ADDED: { title: "Bạn được thêm vào brand", content: "Bạn đã được thêm vào Brand." },
  BRAND_NPOINT_TOPUP_REQUESTED: { title: "Có yêu cầu nạp N-Point mới", content: "Yêu cầu nạp N-Point mới đã được tạo." },
  BRAND_NPOINT_TOPUP_APPROVED: { title: "Yêu cầu nạp N-Point được duyệt", content: "Yêu cầu nạp N-Point của bạn đã được duyệt." },
  BRAND_NPOINT_TOPUP_REJECTED: { title: "Yêu cầu nạp N-Point bị từ chối", content: "Yêu cầu nạp N-Point của bạn đã bị từ chối." },
  BRAND_NPOINT_TOPUP_REFUNDED: { title: "Yêu cầu nạp N-Point đã hoàn tiền", content: "Yêu cầu nạp N-Point của bạn đã được hoàn tiền." },
  BRAND_PRODUCT_APPROVED: { title: "Product được duyệt", content: "Product của Brand đã được duyệt." },
  BRAND_PRODUCT_CHANGES_REQUIRED: { title: "Product cần cập nhật", content: "Product của Brand cần cập nhật theo review." },
  BRAND_FULFILLMENT_UPDATED: { title: "Fulfillment được cập nhật", content: "Điều phối hoặc fulfillment của Brand đã được cập nhật." },
  BRAND_FULFILLMENT_ISSUE: { title: "Fulfillment issue", content: "Fulfillment của Brand đang có vấn đề cần xử lý." },
  CAMPAIGN_APPROVED: { title: "Campaign được duyệt", content: "Campaign của bạn đã được duyệt." },
  CAMPAIGN_REJECTED: { title: "Campaign bị từ chối", content: "Campaign của bạn đã bị từ chối." },
  PAYMENT_SUCCESS: { title: "Thanh toán thành công", content: "Giao dịch thanh toán đã thành công." },
  PAYMENT_FAILED: { title: "Thanh toán thất bại", content: "Giao dịch thanh toán thất bại." },
  PAYOUT_REQUESTED: { title: "Yêu cầu payout", content: "Yêu cầu payout đã được tạo." },
  PAYOUT_APPROVED: { title: "Payout được duyệt", content: "Yêu cầu payout đã được phê duyệt." },
  PAYOUT_PAID: { title: "Payout đã thanh toán", content: "Khoản payout của bạn đã được thanh toán." },
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

export async function markAllAsRead(accountId: string) {
  return prisma.notification.updateMany({
    where: { accountId, channel: "IN_APP", isRead: false },
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

export async function createNotificationForBrandMembers(input: {
  brandId: string;
  event: NotificationEvent;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  excludeAccountId?: string;
  roles?: BrandMemberRole[];
}) {
  const roles = input.roles?.length ? input.roles : [BrandMemberRole.MANAGER, BrandMemberRole.STAFF];
  const targets = await prisma.brandMember.findMany({
    where: {
      brandId: input.brandId,
      status: BrandMemberStatus.ACTIVE,
      role: { in: roles },
      ...(input.excludeAccountId ? { accountId: { not: input.excludeAccountId } } : {})
    },
    select: { accountId: true }
  });

  await Promise.all(
    targets.map((target) =>
      createNotification({
        accountId: target.accountId,
        event: input.event,
        title: input.title,
        content: input.content,
        metadata: input.metadata
      })
    )
  );
}
