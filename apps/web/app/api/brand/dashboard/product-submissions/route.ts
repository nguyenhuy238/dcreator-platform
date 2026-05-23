import { NextRequest } from "next/server";
import { GET_product_submissions, POST_product_submissions, withHandler } from "@/app/api/brand/dashboard/handlers";

export async function GET(request: NextRequest) {
  return withHandler(() => GET_product_submissions(request));
}

export async function POST(request: NextRequest) {
  return withHandler(() => POST_product_submissions(request));
}
