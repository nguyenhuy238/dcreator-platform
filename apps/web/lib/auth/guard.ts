import type { Role } from "@prisma/client";
import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { hasRole } from "@/lib/auth/dashboard-access";
import { getCurrentUser, requireCurrentUser } from "@/lib/auth/current-user";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";
import { prisma } from "@/lib/db";

export async function requireAuth(request: NextRequest) {
  return requireCurrentUser(request);
}

export async function getAuthIfAny(request: NextRequest) {
  return getCurrentUser(request);
}

export async function requireAtLeastRole(request: NextRequest, role: Role) {
  const account = await requireAuth(request);
  if (!account.roles.includes(role)) {
    throw new AppError("Forbidden", 403, "AUTH_FORBIDDEN");
  }
  return account;
}

export async function requireAnyRole(request: NextRequest, roles: Role[]) {
  const account = await requireAuth(request);
  if (!hasRole(account.roles, roles)) {
    throw new AppError("Forbidden", 403, "AUTH_FORBIDDEN");
  }
  return account;
}

export async function requireBrandAccess(request: NextRequest, brandId: string) {
  const account = await requireAnyRole(request, [...DASHBOARD_ACCESS.brand]);
  if (hasRole(account.roles, [...DASHBOARD_ACCESS.admin])) {
    return account;
  }

  const member = await prisma.brandMember.findFirst({
    where: {
      brandId,
      accountId: account.id
    },
    select: { id: true }
  });

  if (!member) {
    throw new AppError("Forbidden brand access", 403, "BRAND_FORBIDDEN");
  }

  return account;
}

export async function requireAdminOrOps(request: NextRequest) {
  return requireAnyRole(request, [...DASHBOARD_ACCESS.admin]);
}
