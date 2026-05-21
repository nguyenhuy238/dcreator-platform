import { NextRequest } from "next/server";
import { GET_profile, PUT_profile, withHandler } from "@/app/api/brand/dashboard/handlers";

export async function GET(request: NextRequest) {
  return withHandler(() => GET_profile(request));
}

export async function PUT(request: NextRequest) {
  return withHandler(() => PUT_profile(request));
}
