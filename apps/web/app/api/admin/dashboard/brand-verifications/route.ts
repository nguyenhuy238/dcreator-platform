import { NextRequest } from "next/server";
import { GET_brand_verifications, withHandler } from "@/app/api/admin/dashboard/handlers";
export async function GET(request: NextRequest) { return withHandler(() => GET_brand_verifications(request)); }
