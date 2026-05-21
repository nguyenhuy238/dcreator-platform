import { Role } from "@prisma/client";
import type { NextRequest } from "next/server";
import { requireAnyRole } from "@/lib/auth/guard";
import { AppError } from "@/lib/errors";

export async function requireAdminOps(request: NextRequest) {
  return requireAnyRole(request, [Role.ADMIN, Role.OPS]);
}

export async function requireAdminForFinanceAction(request: NextRequest) {
  const actor = await requireAdminOps(request);
  if (actor.role !== Role.ADMIN) {
    throw new AppError("Higher role required for this finance action", 403, "FINANCE_HIGHER_ROLE_REQUIRED");
  }
  return actor;
}
