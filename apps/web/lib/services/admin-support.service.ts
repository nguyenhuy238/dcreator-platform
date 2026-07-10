import { NotificationEvent } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/lib/services/audit-log.service";
import { createNotification, createNotificationForAdminOps } from "@/lib/services/notification.service";

export async function listSupportTicketsForAdmin(input: {
  status?: "OPEN" | "IN_PROGRESS" | "WAITING_USER" | "RESOLVED" | "CLOSED";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  category?: "CONTENT" | "REVENUE" | "PAYOUT" | "CAMPAIGN" | "APPLICATION" | "FULFILLMENT" | "ACCOUNT" | "OTHER";
  assigneeId?: string;
  query?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  return prismaAny.supportTicket.findMany({
    where: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.assigneeId ? { assigneeAccountId: input.assigneeId } : {}),
      ...(input.query
        ? {
            OR: [
              { title: { contains: input.query, mode: "insensitive" } },
              { description: { contains: input.query, mode: "insensitive" } },
              { requester: { displayName: { contains: input.query, mode: "insensitive" } } },
              { requester: { email: { contains: input.query, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    include: {
      requester: { select: { id: true, displayName: true, email: true, role: true } },
      assignee: { select: { id: true, displayName: true, email: true, role: true } }
    }
  });
}

export async function getSupportTicketDetailForAdmin(ticketId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  const ticket = await prismaAny.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      requester: { select: { id: true, displayName: true, email: true, role: true } },
      assignee: { select: { id: true, displayName: true, email: true, role: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, displayName: true, email: true, role: true } } }
      }
    }
  });
  if (!ticket) throw new AppError("Support ticket not found", 404, "SUPPORT_TICKET_NOT_FOUND");
  return ticket;
}

export async function updateSupportTicketByAdmin(input: {
  actorId: string;
  ticketId: string;
  status?: "OPEN" | "IN_PROGRESS" | "WAITING_USER" | "RESOLVED" | "CLOSED";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigneeAccountId?: string | null;
  responseSummary?: string;
  internalNote?: string;
}) {
  const current = await getSupportTicketDetailForAdmin(input.ticketId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;

  const updated = await prismaAny.supportTicket.update({
    where: { id: current.id },
    data: {
      status: input.status ?? current.status,
      priority: input.priority ?? current.priority,
      assigneeAccountId: input.assigneeAccountId === undefined ? current.assigneeAccountId : input.assigneeAccountId,
      responseSummary: input.responseSummary ?? current.responseSummary,
      internalNote: input.internalNote ?? current.internalNote
    }
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "SUPPORT_TICKET_UPDATED",
    targetType: "SupportTicket",
    targetId: current.id,
    oldStatus: current.status,
    newStatus: input.status ?? current.status,
    metadata: {
      status: input.status ?? null,
      priority: input.priority ?? null,
      assigneeAccountId: input.assigneeAccountId ?? null
    }
  });

  if (input.responseSummary || input.status === "WAITING_USER" || input.status === "RESOLVED" || input.status === "CLOSED") {
    await createNotification({
      accountId: current.requesterAccountId,
      event: NotificationEvent.PROOF_SUBMITTED,
      title: "Support ticket cập nhật",
      content: `Ticket "${current.title}" đã được cập nhật trạng thái: ${updated.status}.`,
      metadata: { ticketId: current.id, status: updated.status }
    });
  }

  if (
    input.priority === "URGENT" ||
    input.assigneeAccountId !== undefined ||
    input.internalNote
  ) {
    await createNotificationForAdminOps({
      event: NotificationEvent.PROOF_SUBMITTED,
      title: "Support ticket escalation",
      content: `Ticket "${current.title}" cần theo dõi vận hành với trạng thái ${updated.status}.`,
      metadata: {
        ticketId: current.id,
        status: updated.status,
        priority: updated.priority,
        assigneeAccountId: updated.assigneeAccountId
      },
      excludeAccountId: input.actorId
    });
  }

  return updated;
}

export async function addSupportTicketReplyByAdmin(input: {
  actorId: string;
  ticketId: string;
  message: string;
  isInternal?: boolean;
}) {
  const current = await getSupportTicketDetailForAdmin(input.ticketId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  const comment = await prismaAny.supportTicketComment.create({
    data: {
      ticketId: current.id,
      authorId: input.actorId,
      message: input.message,
      isInternal: input.isInternal ?? false
    }
  });

  await writeAuditLog({
    actorId: input.actorId,
    action: "SUPPORT_TICKET_REPLIED",
    targetType: "SupportTicket",
    targetId: current.id,
    metadata: { isInternal: input.isInternal ?? false }
  });

  if (!input.isInternal) {
    await createNotification({
      accountId: current.requesterAccountId,
      event: NotificationEvent.PROOF_SUBMITTED,
      title: "Có phản hồi support ticket",
      content: `Ticket "${current.title}" có phản hồi mới từ admin.`,
      metadata: { ticketId: current.id }
    });
  }

  if (input.isInternal) {
    await createNotificationForAdminOps({
      event: NotificationEvent.PROOF_SUBMITTED,
      title: "Support ticket internal update",
      content: `Ticket "${current.title}" có ghi chú nội bộ mới.`,
      metadata: { ticketId: current.id, commentId: comment.id },
      excludeAccountId: input.actorId
    });
  }

  return comment;
}
