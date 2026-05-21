import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireBrandActor } from "@/lib/auth/brand-guard";
import { toErrorResponse } from "@/lib/errors";
import {
  addRewardTier,
  createBrandCampaign,
  decideCreatorApplication,
  editDraftCampaign,
  getBrandAnalytics,
  getBrandBudget,
  getBrandOverview,
  getBrandProfile,
  listBrandCampaigns,
  listBrandProofs,
  listCreatorApplications,
  listProducts,
  lockCampaignBudget,
  reviewBrandProof,
  submitCampaignForAdminReview,
  topupBrandFund,
  updateBrandProfile,
  upsertProduct
} from "@/lib/services/brand-dashboard.service";
import {
  brandProfileSchema,
  budgetLockSchema,
  budgetTopupSchema,
  campaignCreateSchema,
  creatorApplicationDecisionSchema,
  productSchema,
  proofReviewDecisionSchema,
  rewardTierSchema
} from "@/lib/validators/brand-dashboard";

export async function GET_overview(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await getBrandOverview(account.id));
}

export async function GET_profile(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await getBrandProfile(account.id));
}

export async function PUT_profile(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = brandProfileSchema.parse(await request.json());
  return ok(await updateBrandProfile(account.id, payload));
}

export async function GET_products(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await listProducts(account.id));
}

export async function POST_products(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = productSchema.parse(await request.json());
  return ok(await upsertProduct(account.id, payload), 201);
}

export async function GET_campaigns(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await listBrandCampaigns(account.id));
}

export async function POST_campaigns(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = campaignCreateSchema.parse(await request.json());
  return ok(await createBrandCampaign(account.id, payload), 201);
}

export async function PUT_campaign(request: NextRequest, campaignId: string) {
  const account = await requireBrandActor(request);
  const payload = campaignCreateSchema.parse(await request.json());
  return ok(await editDraftCampaign(account.id, campaignId, payload));
}

export async function POST_campaign_submit(request: NextRequest, campaignId: string) {
  const account = await requireBrandActor(request);
  return ok(await submitCampaignForAdminReview(account.id, campaignId));
}

export async function POST_rewards(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = rewardTierSchema.parse(await request.json());
  return ok(await addRewardTier(account.id, payload), 201);
}

export async function GET_creator_applications(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await listCreatorApplications(account.id));
}

export async function POST_creator_applications(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = creatorApplicationDecisionSchema.parse(await request.json());
  return ok(await decideCreatorApplication(account.id, payload));
}

export async function GET_proofs(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await listBrandProofs(account.id));
}

export async function POST_proofs(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = proofReviewDecisionSchema.parse(await request.json());
  return ok(await reviewBrandProof(account.id, account.role, payload));
}

export async function GET_budget(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await getBrandBudget(account.id));
}

export async function POST_budget_topup(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = budgetTopupSchema.parse(await request.json());
  return ok(await topupBrandFund(account.id, payload), 201);
}

export async function POST_budget_lock(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = budgetLockSchema.parse(await request.json());
  return ok(await lockCampaignBudget(account.id, payload));
}

export async function GET_analytics(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await getBrandAnalytics(account.id));
}

export async function withHandler(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error) {
    return toErrorResponse(error);
  }
}
