import { NextRequest } from "next/server";
import { GET_analytics, withHandler } from "@/app/api/brand/dashboard/handlers";

export async function GET(request: NextRequest) {
  return withHandler(() => GET_analytics(request));
}
