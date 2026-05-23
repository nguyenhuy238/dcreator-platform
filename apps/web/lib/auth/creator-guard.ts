import type { NextRequest } from "next/server";
import { requireAnyRole } from "@/lib/auth/guard";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";

export async function requireApprovedCreator(request: NextRequest) {
  return requireAnyRole(request, [...DASHBOARD_ACCESS.creator]);
}
