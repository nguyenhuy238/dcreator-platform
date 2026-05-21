import type { Role } from "@prisma/client";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getCurrentSessionFromRequest } from "@/lib/auth/session";
import { hasAtLeastRole, hasSomeRole } from "@/lib/auth/roles";

export async function requireAuth(request: NextRequest) {
  const session = await getCurrentSessionFromRequest(request);
  if (!session) {
    throw new AppError("Unauthorized", 401, "AUTH_UNAUTHORIZED");
  }

  const account = await prisma.account.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, displayName: true, role: true, isActive: true }
  });

  if (!account || !account.isActive) {
    throw new AppError("Unauthorized", 401, "AUTH_UNAUTHORIZED");
  }

  return account;
}

export async function requireAtLeastRole(request: NextRequest, role: Role) {
  const account = await requireAuth(request);
  if (!hasAtLeastRole(account.role, role)) {
    throw new AppError("Forbidden", 403, "AUTH_FORBIDDEN");
  }
  return account;
}

export async function requireAnyRole(request: NextRequest, roles: Role[]) {
  const account = await requireAuth(request);
  if (!hasSomeRole(account.role, roles)) {
    throw new AppError("Forbidden", 403, "AUTH_FORBIDDEN");
  }
  return account;
}
