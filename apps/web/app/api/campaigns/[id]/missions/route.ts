import { ok } from "@/lib/api-response";
import { toErrorResponse } from "@/lib/errors";
import { listCampaignMissions } from "@/lib/services/mission.service";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  try {
    const { id } = await params;
    return ok(await listCampaignMissions(id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
