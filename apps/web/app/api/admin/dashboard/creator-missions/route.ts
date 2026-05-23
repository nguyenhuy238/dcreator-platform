import { NextRequest } from "next/server";
import { GET_creator_missions, withHandler } from "@/app/api/admin/dashboard/handlers";

export async function GET(request: NextRequest) {
  return withHandler(() => GET_creator_missions(request));
}
