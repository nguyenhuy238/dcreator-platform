import { RoleRequestStatus, RoleRequestType } from "@prisma/client";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { requireAnyRole } from "@/lib/auth/guard";

export async function requireApprovedCreator(request: NextRequest) {
  const account = await requireAnyRole(request, ["CREATOR"]);

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
