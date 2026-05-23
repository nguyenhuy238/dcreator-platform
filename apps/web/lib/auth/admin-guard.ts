import { Role } from "@prisma/client";
import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { requireAdminOrOps } from "@/lib/auth/guard";

export async function requireAdminOps(request: NextRequest) {
  return requireAdminOrOps(request);
}

export async function requireAdminForFinanceAction(request: NextRequest) {
  const actor = await requireAdminOps(request);
  if (!actor.roles.includes(Role.ADMIN)) {
    throw new AppError("Higher role required for this finance action", 403, "FINANCE_HIGHER_ROLE_REQUIRED");
  }
  return actor;
}
