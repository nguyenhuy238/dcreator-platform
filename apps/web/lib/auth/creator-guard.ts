import type { NextRequest } from "next/server";
import { requireAnyRole } from "@/lib/auth/guard";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function requireApprovedCreator(request: NextRequest) {
  const account = await requireAnyRole(request, [...DASHBOARD_ACCESS.creator]);
  const profile = await prisma.creatorProfile.findUnique({
    where: { accountId: account.id },
    select: { isSuspended: true }
  });
  if (profile?.isSuspended) {
    throw new AppError("Creator account is suspended", 403, "CREATOR_SUSPENDED");
  }
  return account;
}
