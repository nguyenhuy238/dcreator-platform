import { NextRequest } from "next/server";
import { GET_audit_logs, withHandler } from "@/app/api/admin/dashboard/handlers";
export async function GET(request: NextRequest) { return withHandler(() => GET_audit_logs(request)); }
