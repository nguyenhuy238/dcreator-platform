import { NextRequest } from "next/server";
import { GET_products, POST_products, withHandler } from "@/app/api/brand/dashboard/handlers";

export async function GET(request: NextRequest) {
  return withHandler(() => GET_products(request));
}

export async function POST(request: NextRequest) {
  return withHandler(() => POST_products(request));
}
