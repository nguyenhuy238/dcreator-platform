import { NextRequest } from "next/server";
import { GET as GET_ADMIN_DASHBOARD_ANALYTICS } from "@/app/api/admin/dashboard/analytics/route";

// Legacy alias. The canonical Admin Analytics endpoint is /api/admin/dashboard/analytics.
export async function GET(request: NextRequest) {
  return GET_ADMIN_DASHBOARD_ANALYTICS(request);
}
