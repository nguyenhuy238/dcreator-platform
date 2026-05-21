import { ok } from "@/lib/api-response";
import { toErrorResponse } from "@/lib/errors";
import { listActiveRewards } from "@/lib/services/reward.service";

export async function GET() {
  try {
    const data = await listActiveRewards();
    return ok(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}