import { NextRequest } from "next/server";
import { GET_onboarding, PUT_onboarding, withHandler } from "@/app/api/brand/dashboard/handlers";

export async function GET(request: NextRequest) {
  return withHandler(() => GET_onboarding(request));
}

export async function PUT(request: NextRequest) {
  return withHandler(() => PUT_onboarding(request));
}
