import { NextRequest } from "next/server";
import { GET_product_inventory, withHandler } from "@/app/api/admin/dashboard/handlers";

export async function GET(request: NextRequest) {
  return withHandler(() => GET_product_inventory(request));
}
