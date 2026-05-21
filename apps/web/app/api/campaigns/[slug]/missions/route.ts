import { ok } from "@/lib/api-response";
import { toErrorResponse } from "@/lib/errors";
import { listCampaignMissions } from "@/lib/services/mission.service";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Props) {
  try {
    const { slug } = await params;
    return ok(await listCampaignMissions(slug));
  } catch (error) {
    return toErrorResponse(error);
  }
}
