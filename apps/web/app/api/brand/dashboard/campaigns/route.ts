import { NextRequest } from "next/server";
import { GET_campaigns, POST_campaigns, withHandler } from "@/app/api/brand/dashboard/handlers";

export async function GET(request: NextRequest) {
  return withHandler(() => GET_campaigns(request));
}

export async function POST(request: NextRequest) {
  return withHandler(() => POST_campaigns(request));
}
