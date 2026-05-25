import { NextRequest } from "next/server";
import { GET_npoint_topup_requests, withHandler } from "@/app/api/admin/dashboard/handlers";

export async function GET(request: NextRequest) {
  return withHandler(() => GET_npoint_topup_requests(request));
}
