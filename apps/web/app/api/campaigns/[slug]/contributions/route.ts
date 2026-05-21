import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertApiRateLimit } from "@/lib/api/middleware";
import { requireAuth } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/errors";
import { createCampaignContribution } from "@/lib/services/contribution.service";
import { contributionCreateSchema } from "@/lib/validators";

type Props = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const account = await requireAuth(request);
    assertApiRateLimit(request, "contribution", account.id);
    const { slug } = await params;
    const payload = contributionCreateSchema.parse(await request.json());
    const data = await createCampaignContribution(slug, account.id, payload);
    return ok(data, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
