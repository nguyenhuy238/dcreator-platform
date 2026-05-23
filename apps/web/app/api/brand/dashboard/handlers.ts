import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireBrandActor } from "@/lib/auth/brand-guard";
import { toErrorResponse } from "@/lib/errors";
import {
  addRewardTier,
  approveCampaignForPublish,
  createBrandCampaign,
  createBrandCampaignRequest,
  createProductSubmissionForReview,
  decideCreatorApplication,
  editDraftCampaign,
  getBrandAnalytics,
  getBrandBudget,
  getBrandOnboarding,
  getBrandOverview,
  getBrandProfile,
  listBrandCampaigns,
  listBrandCampaignRequests,
  listBrandProofs,
  listCreatorApplications,
  listProducts,
  listProductSubmissionsForBrand,
  lockCampaignBudget,
  reviewBrandProof,
  requestCampaignAdjustment,
  respondBrandCampaignRequest,
  submitCampaignForAdminReview,
  topupBrandFund,
  updateBrandOnboarding,
  updateBrandProfile,
  upsertProduct
} from "@/lib/services/brand-dashboard.service";
import {
  brandOnboardingSchema,
  brandProfileSchema,
  budgetLockSchema,
  budgetTopupSchema,
  campaignBrandFeedbackSchema,
  campaignCreateSchema,
  campaignRequestSchema,
  creatorApplicationDecisionSchema,
  productSchema,
  productSubmissionSchema,
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

export async function GET_onboarding(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await getBrandOnboarding(account.id));
}

export async function PUT_onboarding(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = brandOnboardingSchema.parse(await request.json());
  return ok(await updateBrandOnboarding(account.id, payload));
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

export async function GET_product_submissions(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await listProductSubmissionsForBrand(account.id));
}

export async function POST_product_submissions(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = productSubmissionSchema.parse(await request.json());
  return ok(await createProductSubmissionForReview(account.id, payload), 201);
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

export async function GET_campaign_requests(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await listBrandCampaignRequests(account.id));
}

export async function POST_campaign_requests(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = campaignRequestSchema.parse(await request.json());
  return ok(await createBrandCampaignRequest(account.id, payload), 201);
}

export async function POST_campaign_request_feedback(request: NextRequest, requestId: string) {
  const account = await requireBrandActor(request);
  const payload = campaignBrandFeedbackSchema.parse(await request.json());
  return ok(await respondBrandCampaignRequest(account.id, requestId, payload));
}

export async function POST_campaign_brand_approve(request: NextRequest, campaignId: string) {
  const account = await requireBrandActor(request);
  return ok(await approveCampaignForPublish(account.id, campaignId));
}

export async function POST_campaign_brand_feedback(request: NextRequest, campaignId: string) {
  const account = await requireBrandActor(request);
  const payload = campaignBrandFeedbackSchema.parse(await request.json());
  return ok(await requestCampaignAdjustment(account.id, campaignId, payload));
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
