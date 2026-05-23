import { NextRequest } from "next/server";
import { GET as GET_REPORTS } from "@/app/api/admin/reports/route";

export async function GET(request: NextRequest) {
  return GET_REPORTS(request);
}

