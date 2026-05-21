import { ok } from "@/lib/api-response";
import { toErrorResponse } from "@/lib/errors";
import { listOpenMissions } from "@/lib/services/mission.service";

export async function GET() {
  try {
    const data = await listOpenMissions();
    return ok(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}