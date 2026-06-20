import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireBrandActor } from "@/lib/auth/brand-guard";
import { AppError, toErrorResponse } from "@/lib/errors";
import {
  addRewardTier,
  addCampaignMissionForBrand,
  approveCampaignForPublish,
  createBrandCampaignRequest,
  createProductSubmissionForReview,
  decideCreatorApplication,
  getBrandAnalytics,
  getBrandCampaignTemplateConfig,
  getBrandBudget,
  getBrandOnboarding,
  getBrandOverview,
  getBrandProfile,
  listBrandCampaigns,
  listCampaignMissionsForBrand,
  listBrandCampaignShippingCreators,
  listBrandCampaignRequests,
  listBrandMembers,
  listBrandProofs,
  listCreatorApplications,
  listProducts,
  listProductSubmissionsForBrand,
  lockCampaignBudget,
  removeBrandMember,
  reviewBrandProof,
  requestCampaignAdjustment,
  respondBrandCampaignRequest,
  markBrandCampaignSampleShipped,
  topupBrandFund,
  updateBrandMemberRole,
  updateBrandOnboarding,
  updateBrandProfile,
  upsertProduct,
  inviteBrandMember
} from "@/lib/services/brand-dashboard.service";
import { getBrandSubscriptionState, purchaseBrandSubscription } from "@/lib/services/brand-subscription.service";
import {
  createBrandNPointTopupRequest,
  getBrandNPointWallet,
  submitBrandNPointRefundInfo
} from "@/lib/services/n-point-topup.service";
import {
  brandMemberInviteSchema,
  brandMemberRemoveSchema,
  brandMemberRoleUpdateSchema,
  brandOnboardingSchema,
  brandProfileSchema,
  budgetLockSchema,
  budgetTopupSchema,
  campaignBrandFeedbackSchema,
  campaignMissionCreateSchema,
  campaignRequestSchema,
  creatorApplicationDecisionSchema,
  brandSubscriptionPurchaseSchema,
  productSchema,
  productSubmissionSchema,
  proofReviewDecisionSchema,
  rewardTierSchema
} from "@/lib/validators/brand-dashboard";
import { brandNPointRefundInfoSchema, brandNPointTopupCreateSchema } from "@/lib/validators/n-point-topup";

export async function GET_overview(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await getBrandOverview(account.id, account.currentBrandId));
}

export async function GET_profile(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await getBrandProfile(account.id, account.currentBrandId));
}

export async function GET_onboarding(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await getBrandOnboarding(account.id, account.currentBrandId));
}

export async function PUT_onboarding(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = brandOnboardingSchema.parse(await request.json());
  return ok(await updateBrandOnboarding(account.id, payload, account.currentBrandId));
}

export async function PUT_profile(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = brandProfileSchema.parse(await request.json());
  return ok(await updateBrandProfile(account.id, payload, account.currentBrandId));
}

export async function GET_products(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await listProducts(account.id, account.currentBrandId));
}

export async function POST_products(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = productSchema.parse(await request.json());
  return ok(await upsertProduct(account.id, payload, account.currentBrandId), 201);
}

export async function GET_product_submissions(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await listProductSubmissionsForBrand(account.id, account.currentBrandId));
}

export async function POST_product_submissions(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = productSubmissionSchema.parse(await request.json());
  return ok(await createProductSubmissionForReview(account.id, payload, account.currentBrandId), 201);
}

export async function GET_campaigns(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await listBrandCampaigns(account.id, account.currentBrandId));
}

export async function POST_campaigns(request: NextRequest): Promise<Response> {
  await requireBrandActor(request);
  throw new AppError("Brand không còn tạo campaign trực tiếp. Vui lòng dùng form 'Yêu cầu Admin tạo campaign'.", 410, "BRAND_CAMPAIGN_DIRECT_CREATE_DISABLED");
}

export async function PUT_campaign(request: NextRequest, campaignId: string): Promise<Response> {
  await requireBrandActor(request);
  void campaignId;
  throw new AppError("Luồng chỉnh sửa draft campaign từ Brand đã tắt. Vui lòng gửi thông tin qua form yêu cầu.", 410, "BRAND_CAMPAIGN_DRAFT_EDIT_DISABLED");
}

export async function POST_campaign_submit(request: NextRequest, campaignId: string): Promise<Response> {
  await requireBrandActor(request);
  void campaignId;
  throw new AppError("Luồng submit campaign review từ Brand đã tắt. Vui lòng gửi thông tin qua form yêu cầu.", 410, "BRAND_CAMPAIGN_SUBMIT_REVIEW_DISABLED");
}

export async function GET_campaign_requests(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await listBrandCampaignRequests(account.id, account.currentBrandId));
}

export async function POST_campaign_requests(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = campaignRequestSchema.parse(await request.json());
  return ok(await createBrandCampaignRequest(account.id, payload, account.currentBrandId), 201);
}

export async function GET_campaign_template(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await getBrandCampaignTemplateConfig(account.id, account.currentBrandId));
}

export async function POST_campaign_request_feedback(request: NextRequest, requestId: string) {
  const account = await requireBrandActor(request);
  const payload = campaignBrandFeedbackSchema.parse(await request.json());
  return ok(await respondBrandCampaignRequest(account.id, requestId, payload, account.currentBrandId));
}

export async function POST_campaign_brand_approve(request: NextRequest, campaignId: string) {
  const account = await requireBrandActor(request);
  return ok(await approveCampaignForPublish(account.id, campaignId, account.currentBrandId));
}

export async function POST_campaign_brand_feedback(request: NextRequest, campaignId: string) {
  const account = await requireBrandActor(request);
  const payload = campaignBrandFeedbackSchema.parse(await request.json());
  return ok(await requestCampaignAdjustment(account.id, campaignId, payload, account.currentBrandId));
}

export async function POST_rewards(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = rewardTierSchema.parse(await request.json());
  return ok(await addRewardTier(account.id, payload, account.currentBrandId), 201);
}

export async function GET_creator_applications(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await listCreatorApplications(account.id, account.currentBrandId));
}

export async function POST_creator_applications(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = creatorApplicationDecisionSchema.parse(await request.json());
  return ok(await decideCreatorApplication(account.id, payload, account.currentBrandId));
}

export async function GET_proofs(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await listBrandProofs(account.id, account.currentBrandId));
}

export async function POST_proofs(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = proofReviewDecisionSchema.parse(await request.json());
  return ok(await reviewBrandProof(account.id, account.role, payload, account.currentBrandId));
}

export async function GET_budget(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await getBrandBudget(account.id, account.currentBrandId));
}

export async function POST_budget_topup(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = budgetTopupSchema.parse(await request.json());
  return ok(await topupBrandFund(account.id, payload), 201);
}

export async function POST_budget_lock(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = budgetLockSchema.parse(await request.json());
  return ok(await lockCampaignBudget(account.id, payload, account.currentBrandId));
}

export async function GET_analytics(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await getBrandAnalytics(account.id, account.currentBrandId));
}

export async function POST_campaign_mission(request: NextRequest, campaignId: string) {
  const account = await requireBrandActor(request);
  const payload = campaignMissionCreateSchema.parse(await request.json());
  return ok(await addCampaignMissionForBrand(account.id, campaignId, payload, account.currentBrandId), 201);
}

export async function GET_campaign_missions(request: NextRequest, campaignId: string) {
  const account = await requireBrandActor(request);
  return ok(await listCampaignMissionsForBrand(account.id, campaignId, account.currentBrandId));
}

export async function GET_campaign_shipping(request: NextRequest, campaignId: string) {
  const account = await requireBrandActor(request);
  return ok(await listBrandCampaignShippingCreators(account.id, campaignId, account.currentBrandId));
}

export async function POST_campaign_shipping_shipped(request: NextRequest, campaignId: string) {
  const account = await requireBrandActor(request);
  const payload = (await request.json()) as { creatorMissionId?: string };
  const creatorMissionId = payload.creatorMissionId?.trim();
  if (!creatorMissionId) throw new AppError("creatorMissionId is required", 422, "CREATOR_MISSION_ID_REQUIRED");
  return ok(await markBrandCampaignSampleShipped(account.id, campaignId, creatorMissionId, account.currentBrandId));
}

export async function GET_members(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await listBrandMembers(account.id, account.currentBrandId));
}

export async function POST_members(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = brandMemberInviteSchema.parse(await request.json());
  return ok(await inviteBrandMember(account.id, payload, account.currentBrandId), 201);
}

export async function PATCH_members(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = brandMemberRoleUpdateSchema.parse(await request.json());
  return ok(await updateBrandMemberRole(account.id, payload, account.currentBrandId));
}

export async function DELETE_members(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = brandMemberRemoveSchema.parse(await request.json());
  return ok(await removeBrandMember(account.id, payload, account.currentBrandId));
}

export async function GET_npoint_wallet(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await getBrandNPointWallet(account.id, account.currentBrandId));
}

export async function POST_npoint_topup_request(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = brandNPointTopupCreateSchema.parse(await request.json());
  return ok(await createBrandNPointTopupRequest(account.id, payload, account.currentBrandId), 201);
}

export async function POST_npoint_refund_info(request: NextRequest, requestId: string) {
  const account = await requireBrandActor(request);
  const payload = brandNPointRefundInfoSchema.parse(await request.json());
  return ok(await submitBrandNPointRefundInfo(account.id, requestId, payload, account.currentBrandId));
}

export async function GET_subscriptions(request: NextRequest) {
  const account = await requireBrandActor(request);
  return ok(await getBrandSubscriptionState(account.id, account.currentBrandId));
}

export async function POST_subscriptions_purchase(request: NextRequest) {
  const account = await requireBrandActor(request);
  const payload = brandSubscriptionPurchaseSchema.parse(await request.json());
  return ok(await purchaseBrandSubscription(account.id, payload.packageCode, account.currentBrandId));
}

export async function withHandler(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error) {
    return toErrorResponse(error);
  }
}
