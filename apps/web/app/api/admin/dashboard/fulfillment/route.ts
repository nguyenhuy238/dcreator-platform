import { NextRequest } from "next/server";
import { GET_fulfillment, withHandler } from "@/app/api/admin/dashboard/handlers";

export async function GET(request: NextRequest) {
  return withHandler(() => GET_fulfillment(request));
}
