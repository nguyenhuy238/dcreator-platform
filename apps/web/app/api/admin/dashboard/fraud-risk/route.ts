import { NextRequest } from "next/server";
import { GET_fraud_risk, withHandler } from "@/app/api/admin/dashboard/handlers";
export async function GET(request: NextRequest) { return withHandler(() => GET_fraud_risk(request)); }
