import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { requireAdminOps } from "@/lib/auth/admin-guard";
import { toErrorResponse } from "@/lib/errors";
import {
  approveRoleRequestByAdmin,
  decideCampaignReview,
  decideProofByAdmin,
  getAdminOverview,
  getAdminAnalytics,
  getAuditLogs,
  getFinanceSnapshot,
  getFraudRiskSnapshot,
  getVoucherManagement,
  listPendingCampaignReviews,
  listPendingProofs,
  listRoleRequests,
  listUsersForAdmin,
  lockUserByAdmin,
  rejectRoleRequestByAdmin,
  unlockUserByAdmin
} from "@/lib/services/admin-dashboard.service";
import {
  adminAuditQuerySchema,
  adminCampaignDecisionSchema,
  adminProofDecisionSchema,
  adminRejectSchema,
  adminUserQuerySchema
} from "@/lib/validators/admin-dashboard";
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
