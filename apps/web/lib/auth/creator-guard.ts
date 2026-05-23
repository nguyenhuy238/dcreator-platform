import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";

export async function requireApprovedCreator(request: NextRequest) {
  return requireRole(request, DASHBOARD_ACCESS.creator);
}
