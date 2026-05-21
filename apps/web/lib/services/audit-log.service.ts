import { prisma } from "@/lib/db";

export async function writeAuditLog(input: {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: unknown;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata as object | undefined
    }
  });
}
