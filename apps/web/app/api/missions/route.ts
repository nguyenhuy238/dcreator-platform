import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/errors";
import { listOpenMissions } from "@/lib/services/mission.service";

export async function GET() {
  try {
    const data = await listOpenMissions();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
