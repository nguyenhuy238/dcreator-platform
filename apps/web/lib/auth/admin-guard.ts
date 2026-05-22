import { Role } from "@prisma/client";
import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { requireRole } from "@/lib/auth/guards";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";

export async function requireAdminOps(request: NextRequest) {
  return requireRole(request, DASHBOARD_ACCESS.admin);
}

export async function requireAdminForFinanceAction(request: NextRequest) {
  const actor = await requireAdminOps(request);
  if (!actor.roles.includes(Role.ADMIN)) {
    throw new AppError("Higher role required for this finance action", 403, "FINANCE_HIGHER_ROLE_REQUIRED");
  }
  return actor;
}
