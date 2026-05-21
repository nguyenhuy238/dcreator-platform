import { NextRequest } from "next/server";
import { POST_budget_topup, withHandler } from "@/app/api/brand/dashboard/handlers";

export async function POST(request: NextRequest) {
  return withHandler(() => POST_budget_topup(request));
}
