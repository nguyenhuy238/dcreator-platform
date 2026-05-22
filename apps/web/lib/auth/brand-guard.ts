import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";

export async function requireBrandActor(request: NextRequest) {
  return requireRole(request, DASHBOARD_ACCESS.brand);
}
