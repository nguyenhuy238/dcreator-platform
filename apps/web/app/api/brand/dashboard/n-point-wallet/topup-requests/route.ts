import { NextRequest } from "next/server";
import { POST_npoint_topup_request, withHandler } from "@/app/api/brand/dashboard/handlers";

export async function POST(request: NextRequest) {
  return withHandler(() => POST_npoint_topup_request(request));
}
