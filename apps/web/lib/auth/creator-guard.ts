import { RoleRequestStatus, RoleRequestType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { requireRole } from "@/lib/auth/guards";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";

export async function requireApprovedCreator(request: NextRequest) {
  const account = await requireRole(request, DASHBOARD_ACCESS.creator);
  if (account.roles.includes("ADMIN") || account.roles.includes("OPS")) return account;

  const approvedRequest = await prisma.roleRequest.findFirst({
    where: {
      accountId: account.id,
      type: RoleRequestType.CREATOR,
      status: RoleRequestStatus.APPROVED
    },
    select: { id: true }
  });

  if (!approvedRequest) {
    throw new AppError("Creator role is not approved", 403, "CREATOR_NOT_APPROVED");
  }

  return account;
}
