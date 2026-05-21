import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { listActiveRewards } from "@/lib/services/reward.service";

export async function GET() {
  try {
    const data = await listActiveRewards();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
