import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { getCurrentSessionFromRequest } from "@/lib/auth/session";
import { toErrorResponse } from "@/lib/errors";
import { getCampaignDetailBySlug } from "@/lib/services/campaign-detail.service";
import { campaignSlugSchema } from "@/lib/validators";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { slug } = campaignSlugSchema.parse(await params);
    const session = await getCurrentSessionFromRequest(request).catch(() => null);
    const data = await getCampaignDetailBySlug(slug, session?.sub);
    return ok(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
