import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { getAuthIfAny } from "@/lib/auth/guard";
import { requireApprovedCreator } from "@/lib/auth/creator-guard";
import { toErrorResponse } from "@/lib/errors";
import { campaignSlugSchema } from "@/lib/validators";
import {
  getCreatorCampaignApplicationStatus,
  submitCreatorCampaignApplication
} from "@/lib/services/campaign-application.service";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { slug } = campaignSlugSchema.parse(await params);
    const account = await getAuthIfAny(request);
    return ok(
      await getCreatorCampaignApplicationStatus(
        slug,
        account
          ? {
              id: account.id,
              roles: account.roles
            }
          : null
      )
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    assertSameOrigin(request);
    const { slug } = campaignSlugSchema.parse(await params);
    const account = await requireApprovedCreator(request);
    return ok(await submitCreatorCampaignApplication(slug, account.id), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
