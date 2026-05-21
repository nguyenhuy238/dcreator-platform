import type { NextRequest } from "next/server";
import { requireAnyRole } from "@/lib/auth/guard";

export async function requireBrandActor(request: NextRequest) {
  return requireAnyRole(request, ["BRAND_OWNER", "BRAND_STAFF"]);
}
