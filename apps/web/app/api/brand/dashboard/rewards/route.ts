import { NextRequest } from "next/server";
import { POST_rewards, withHandler } from "@/app/api/brand/dashboard/handlers";

export async function POST(request: NextRequest) {
  return withHandler(() => POST_rewards(request));
}
