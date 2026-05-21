import { NextRequest } from "next/server";
import { GET_creator_applications, POST_creator_applications, withHandler } from "@/app/api/brand/dashboard/handlers";

export async function GET(request: NextRequest) {
  return withHandler(() => GET_creator_applications(request));
}

export async function POST(request: NextRequest) {
  return withHandler(() => POST_creator_applications(request));
}
