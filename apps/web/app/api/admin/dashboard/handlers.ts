import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import {
  decideCreatorCampaignApplicationByAdmin,
  decideCreatorMissionWorkflowByAdmin,
  approveRoleRequestByAdmin,
  decideCampaignReview,
  decideProofByAdmin,
  getAdminOverview,
  getAdminAnalytics,
  getAuditLogs,
  getFinanceSnapshot,
  getFraudRiskSnapshot,
  getFulfillmentSnapshot,
  getVoucherManagement,
  getProductInventorySnapshot,
  listCreatorMissionWorkflowForAdmin,
  listPendingCampaignReviews,
  listPendingProofs,
  listCreatorCampaignApplicationsForAdmin,
  listRoleRequests,
  listUsersForAdmin,
  lockUserByAdmin,
  rejectRoleRequestByAdmin,
  unlockUserByAdmin
} from "@/lib/services/admin-dashboard.service";
import {
  approveAdminNPointTopupRequest,
  completeAdminNPointRefund,
  listAdminNPointTopupRequests,
  rejectAdminNPointTopupRequest
} from "@/lib/services/n-point-topup.service";
import {
  adminAuditQuerySchema,
  adminCampaignDecisionSchema,
  adminCreatorCampaignApplicationQuerySchema,
  adminCreatorCampaignDecisionSchema,
  adminCreatorMissionDecisionSchema,
  adminProofDecisionSchema,
  adminRejectSchema,
  adminUserQuerySchema
} from "@/lib/validators/admin-dashboard";
import {
  adminNPointRefundCompleteSchema,
  adminNPointTopupApproveSchema,
  adminNPointTopupRejectSchema,
  adminNPointTopupStatusQuerySchema
} from "@/lib/validators/n-point-topup";
import { voucherAdminQuerySchema } from "@/lib/validators/voucher";

function optionalQueryParam(request: NextRequest, key: string) {
  const value = request.nextUrl.searchParams.get(key);
  if (!value) return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export async function withHandler(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET_overview(request: NextRequest) {
  await requireAdminOps(request);
  return ok(await getAdminOverview());
}

export async function GET_users(request: NextRequest) {
  await requireAdminOps(request);
  const parsed = adminUserQuerySchema.parse({
    query: optionalQueryParam(request, "query"),
    page: request.nextUrl.searchParams.get("page") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined
  });
  return ok(await listUsersForAdmin(parsed));
}

export async function POST_user_lock(request: NextRequest, userId: string) {
  const actor = await requireAdminOps(request);
  return ok(await lockUserByAdmin(actor.id, userId));
}

export async function POST_user_unlock(request: NextRequest, userId: string) {
  const actor = await requireAdminOps(request);
  return ok(await unlockUserByAdmin(actor.id, userId));
}

export async function GET_creator_verifications(request: NextRequest) {
  await requireAdminOps(request);
  return ok(await listRoleRequests("CREATOR"));
}

export async function POST_creator_verification_approve(request: NextRequest, requestId: string) {
  const actor = await requireAdminOps(request);
  return ok(await approveRoleRequestByAdmin(actor.id, requestId));
}

export async function POST_creator_verification_reject(request: NextRequest, requestId: string) {
  const actor = await requireAdminOps(request);
  const payload = adminRejectSchema.parse(await request.json());
  return ok(await rejectRoleRequestByAdmin(actor.id, requestId, payload.reason));
}

export async function GET_brand_verifications(request: NextRequest) {
  await requireAdminOps(request);
  return ok(await listRoleRequests("BRAND"));
}

export async function POST_brand_verification_approve(request: NextRequest, requestId: string) {
  const actor = await requireAdminOps(request);
  return ok(await approveRoleRequestByAdmin(actor.id, requestId));
}

export async function POST_brand_verification_reject(request: NextRequest, requestId: string) {
  const actor = await requireAdminOps(request);
  const payload = adminRejectSchema.parse(await request.json());
  return ok(await rejectRoleRequestByAdmin(actor.id, requestId, payload.reason));
}

export async function GET_campaign_reviews(request: NextRequest) {
  await requireAdminOps(request);
  return ok(await listPendingCampaignReviews());
}

export async function POST_campaign_decision(request: NextRequest, campaignId: string) {
  const actor = await requireAdminOps(request);
  const payload = adminCampaignDecisionSchema.parse(await request.json());
  return ok(await decideCampaignReview(actor.id, campaignId, payload.decision, payload.reason));
}

export async function GET_proofs(request: NextRequest) {
  await requireAdminOps(request);
  return ok(await listPendingProofs());
}

export async function POST_proof_decision(request: NextRequest, submissionId: string) {
  const actor = await requireAdminOps(request);
  const payload = adminProofDecisionSchema.parse(await request.json());
  return ok(await decideProofByAdmin(actor.id, actor.role, submissionId, payload.decision, payload.reason, payload.note));
}

export async function GET_vouchers(request: NextRequest) {
  await requireAdminOps(request);
  const parsed = voucherAdminQuerySchema.parse({
    code: optionalQueryParam(request, "code"),
    user: optionalQueryParam(request, "user"),
    campaign: optionalQueryParam(request, "campaign"),
    page: request.nextUrl.searchParams.get("page") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined
  });
  return ok(await getVoucherManagement(parsed));
}

export async function GET_finance(request: NextRequest) {
  await requireAdminOps(request);
  return ok(await getFinanceSnapshot());
}

export async function GET_fraud_risk(request: NextRequest) {
  await requireAdminOps(request);
  return ok(await getFraudRiskSnapshot());
}

export async function GET_audit_logs(request: NextRequest) {
  await requireAdminOps(request);
  const parsed = adminAuditQuerySchema.parse({
    action: optionalQueryParam(request, "action"),
    targetType: optionalQueryParam(request, "targetType"),
    page: request.nextUrl.searchParams.get("page") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined
  });
  return ok(await getAuditLogs(parsed));
}

export async function GET_analytics(request: NextRequest) {
  await requireAdminOps(request);
  return ok(await getAdminAnalytics());
}

export async function GET_product_inventory(request: NextRequest) {
  await requireAdminOps(request);
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  return ok(await getProductInventorySnapshot({ page: Number.isFinite(page) && page > 0 ? page : 1, limit: Number.isFinite(limit) && limit > 0 ? limit : 20 }));
}

export async function GET_fulfillment(request: NextRequest) {
  await requireAdminOps(request);
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  return ok(await getFulfillmentSnapshot({ page: Number.isFinite(page) && page > 0 ? page : 1, limit: Number.isFinite(limit) && limit > 0 ? limit : 20 }));
}

export async function GET_creator_campaign_applications(request: NextRequest) {
  await requireAdminOps(request);
  const parsed = adminCreatorCampaignApplicationQuerySchema.parse({
    status: optionalQueryParam(request, "status"),
    query: optionalQueryParam(request, "query")
  });
  return ok(await listCreatorCampaignApplicationsForAdmin(parsed.status, parsed.query));
}

export async function POST_creator_campaign_application_decision(request: NextRequest, submissionId: string) {
  const actor = await requireAdminOps(request);
  const payload = adminCreatorCampaignDecisionSchema.parse(await request.json());
  return ok(
    await decideCreatorCampaignApplicationByAdmin(
      actor.id,
      submissionId,
      payload.decision,
      payload.rejectReason,
      payload.note
    )
  );
}

export async function GET_creator_missions(request: NextRequest) {
  await requireAdminOps(request);
  return ok(await listCreatorMissionWorkflowForAdmin());
}

export async function POST_creator_mission_decision(request: NextRequest, creatorMissionId: string) {
  const actor = await requireAdminOps(request);
  const payload = adminCreatorMissionDecisionSchema.parse(await request.json());
  return ok(
    await decideCreatorMissionWorkflowByAdmin(
      actor.id,
      creatorMissionId,
      payload.action,
      payload.reason,
      payload.purchaseAmountVnd
    )
  );
}

export async function GET_npoint_topup_requests(request: NextRequest) {
  await requireAdminOps(request);
  const parsed = adminNPointTopupStatusQuerySchema.parse({
    status: optionalQueryParam(request, "status")
  });
  return ok(await listAdminNPointTopupRequests(parsed.status));
}

export async function POST_npoint_topup_approve(request: NextRequest, requestId: string) {
  const actor = await requireAdminOps(request);
  const payload = adminNPointTopupApproveSchema.parse(await request.json());
  return ok(await approveAdminNPointTopupRequest(actor.id, requestId, payload));
}

export async function POST_npoint_topup_reject(request: NextRequest, requestId: string) {
  const actor = await requireAdminOps(request);
  const payload = adminNPointTopupRejectSchema.parse(await request.json());
  return ok(await rejectAdminNPointTopupRequest(actor.id, requestId, payload.reason));
}

export async function POST_npoint_refund_complete(request: NextRequest, requestId: string) {
  const actor = await requireAdminOps(request);
  const payload = adminNPointRefundCompleteSchema.parse(await request.json());
  return ok(await completeAdminNPointRefund(actor.id, requestId, payload));
}
