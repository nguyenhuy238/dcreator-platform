import { NextRequest } from "next/server";
import { GET_users, withHandler } from "@/app/api/admin/dashboard/handlers";
export async function GET(request: NextRequest) { return withHandler(() => GET_users(request)); }
