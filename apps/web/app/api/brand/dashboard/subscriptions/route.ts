import { NextRequest } from "next/server";
import { GET_subscriptions, POST_subscriptions_purchase, withHandler } from "@/app/api/brand/dashboard/handlers";

export async function GET(request: NextRequest) {
  return withHandler(() => GET_subscriptions(request));
}

export async function POST(request: NextRequest) {
  return withHandler(() => POST_subscriptions_purchase(request));
}

