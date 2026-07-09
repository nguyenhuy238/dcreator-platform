import { AnalyticsEventName } from "@prisma/client";
import { DCREATOR_ANALYTICS_EVENTS, type DcreatorAnalyticsEventName } from "./analytics-events.ts";

export type MetadataValue = string | number | boolean | null | MetadataValue[] | { [key: string]: MetadataValue };

export type DcreatorEventMetadataInput = {
  eventName: DcreatorAnalyticsEventName | string;
  actorId?: string | null;
  accountId?: string | null;
  userId?: string | null;
  brandId?: string | null;
  creatorId?: string | null;
  campaignId?: string | null;
  missionId?: string | null;
  creatorMissionId?: string | null;
  proofId?: string | null;
  paymentId?: string | null;
  payoutRequestId?: string | null;
  exportType?: string | null;
  metadata?: Record<string, unknown>;
};

const SENSITIVE_METADATA_KEYS = [
  /password/i,
  /token/i,
  /secret/i,
  /cookie/i,
  /authorization/i,
  /otp/i,
  /checksum/i,
  /signature/i,
  /hash/i,
  /rawPayload/i,
  /accountNumber/i,
  /bankAccount/i,
  /private.*url/i,
  /card/i,
  /cvv/i
];

const DCREATOR_EVENT_DB_COMPAT: Partial<Record<DcreatorAnalyticsEventName, AnalyticsEventName>> = {
  [DCREATOR_ANALYTICS_EVENTS.CAMPAIGN_REQUEST_CREATED]: AnalyticsEventName.brand_create_campaign,
  [DCREATOR_ANALYTICS_EVENTS.CAMPAIGN_REQUEST_APPROVED]: AnalyticsEventName.brand_create_campaign,
  [DCREATOR_ANALYTICS_EVENTS.CAMPAIGN_CREATED]: AnalyticsEventName.brand_create_campaign,
  [DCREATOR_ANALYTICS_EVENTS.CAMPAIGN_PUBLISHED]: AnalyticsEventName.brand_create_campaign,
  [DCREATOR_ANALYTICS_EVENTS.CREATOR_APPLICATION_SUBMITTED]: AnalyticsEventName.creator_apply_job,
  [DCREATOR_ANALYTICS_EVENTS.CREATOR_APPLICATION_APPROVED]: AnalyticsEventName.creator_apply_job,
  [DCREATOR_ANALYTICS_EVENTS.CREATOR_APPLICATION_REJECTED]: AnalyticsEventName.creator_apply_job,
  [DCREATOR_ANALYTICS_EVENTS.CREATOR_MISSION_ASSIGNED]: AnalyticsEventName.creator_apply_job,
  [DCREATOR_ANALYTICS_EVENTS.CREATOR_MISSION_ACCEPTED]: AnalyticsEventName.mission_accept,
  [DCREATOR_ANALYTICS_EVENTS.CREATOR_MISSION_DECLINED]: AnalyticsEventName.mission_accept,
  [DCREATOR_ANALYTICS_EVENTS.CREATOR_PROOF_SUBMITTED]: AnalyticsEventName.mission_submit,
  [DCREATOR_ANALYTICS_EVENTS.CREATOR_PROOF_APPROVED]: AnalyticsEventName.proof_approved,
  [DCREATOR_ANALYTICS_EVENTS.CREATOR_PROOF_REJECTED]: AnalyticsEventName.proof_rejected,
  [DCREATOR_ANALYTICS_EVENTS.PAYMENT_SUCCEEDED]: AnalyticsEventName.payment_success,
  [DCREATOR_ANALYTICS_EVENTS.PAYMENT_FAILED]: AnalyticsEventName.payment_failed
};

function isSensitiveKey(key: string) {
  return SENSITIVE_METADATA_KEYS.some((pattern) => pattern.test(key));
}

function sanitizeValue(value: unknown, depth: number): MetadataValue | undefined {
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value.slice(0, 300);
  if (Array.isArray(value)) {
    if (depth >= 2) return "[array]";
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1) ?? null);
  }
  if (value && typeof value === "object") {
    if (depth >= 2) return "[object]";
    return sanitizeAnalyticsMetadata(value as Record<string, unknown>, depth + 1) ?? {};
  }
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") return undefined;
  return String(value).slice(0, 300);
}

export function sanitizeAnalyticsMetadata(metadata?: Record<string, unknown> | null, depth = 0) {
  if (!metadata) return null;
  const entries = Object.entries(metadata)
    .filter(([key]) => !isSensitiveKey(key))
    .slice(0, 30)
    .flatMap(([key, value]) => {
      const sanitized = sanitizeValue(value, depth);
      return typeof sanitized === "undefined" ? [] : ([[key, sanitized]] as const);
    });
  return Object.fromEntries(entries) as Record<string, MetadataValue>;
}

export function resolveAnalyticsEventNameForDb(eventName: DcreatorAnalyticsEventName | string) {
  if (Object.values(AnalyticsEventName).includes(eventName as AnalyticsEventName)) return eventName as AnalyticsEventName;
  return DCREATOR_EVENT_DB_COMPAT[eventName as DcreatorAnalyticsEventName] ?? null;
}

export function buildDcreatorEventMetadata(input: DcreatorEventMetadataInput) {
  return sanitizeAnalyticsMetadata({
    ...(input.metadata ?? {}),
    dcreatorEventName: input.eventName,
    actorId: input.actorId ?? null,
    accountId: input.accountId ?? input.userId ?? null,
    brandId: input.brandId ?? null,
    creatorId: input.creatorId ?? null,
    campaignId: input.campaignId ?? null,
    missionId: input.missionId ?? null,
    creatorMissionId: input.creatorMissionId ?? null,
    proofId: input.proofId ?? null,
    paymentId: input.paymentId ?? null,
    payoutRequestId: input.payoutRequestId ?? null,
    exportType: input.exportType ?? null
  });
}
