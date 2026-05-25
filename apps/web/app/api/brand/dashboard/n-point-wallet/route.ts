import { NextRequest } from "next/server";
import { GET_npoint_wallet, withHandler } from "@/app/api/brand/dashboard/handlers";

export async function GET(request: NextRequest) {
  return withHandler(() => GET_npoint_wallet(request));
}
