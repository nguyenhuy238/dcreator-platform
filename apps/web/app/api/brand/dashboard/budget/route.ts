import { NextRequest } from "next/server";
import { GET_budget, withHandler } from "@/app/api/brand/dashboard/handlers";

export async function GET(request: NextRequest) {
  return withHandler(() => GET_budget(request));
}
