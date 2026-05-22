import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { CurrentUser } from "@/lib/auth/current-user";
import { hasRole } from "@/lib/auth/dashboard-access";
import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/auth/current-user";

export function assertRole(user: CurrentUser, allowedRoles: readonly Role[]) {
  if (!hasRole(user.roles, allowedRoles)) {
    throw new AppError("Forbidden", 403, "AUTH_FORBIDDEN");
  }
}

export function assertAdmin(user: CurrentUser) {
  assertRole(user, ["ADMIN", "OPS"]);
}

export async function requireAuthUser(request: NextRequest) {
  return requireCurrentUser(request);
}

export async function requireRole(request: NextRequest, allowedRoles: readonly Role[]) {
  const user = await requireCurrentUser(request);
  assertRole(user, allowedRoles);
  return user;
}

export async function assertCanAccessBrand(user: CurrentUser, brandId: string) {
  if (hasRole(user.roles, ["ADMIN", "OPS"])) return;
  const member = await prisma.brandMember.findFirst({
    where: {
      brandId,
      accountId: user.id
    },
    select: { id: true }
  });
  if (!member) throw new AppError("Forbidden brand access", 403, "BRAND_FORBIDDEN");
}
