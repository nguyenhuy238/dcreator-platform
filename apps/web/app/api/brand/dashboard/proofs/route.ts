import { NextRequest } from "next/server";
import { GET_proofs, POST_proofs, withHandler } from "@/app/api/brand/dashboard/handlers";

export async function GET(request: NextRequest) {
  return withHandler(() => GET_proofs(request));
}

export async function POST(request: NextRequest) {
  return withHandler(() => POST_proofs(request));
}
