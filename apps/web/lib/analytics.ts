import type { AnalyticsEventName } from "@/lib/analytics-events";

export type GtagEventParams = Record<string, string | number | boolean | undefined>;

type GtagConfigParams = {
  page_path?: string;
  page_location?: string;
  page_title?: string;
};

declare global {
  interface Window {
    gtag?: {
      (command: "event", eventName: AnalyticsEventName | string, params?: GtagEventParams): void;
      (command: "config", gaId: string, params?: GtagConfigParams): void;
    };
  }
}

export function trackEvent(eventName: AnalyticsEventName | string, params?: GtagEventParams) {
  if (typeof window === "undefined") return;
  if (!window.gtag) return;

  window.gtag("event", eventName, {
    ...params,
    app_name: "dcreator"
  });
}

export function trackSignUp(method: string) {
  trackEvent("sign_up", { method });
}

export function trackCreatorRegisterSuccess() {
  trackEvent("creator_register_success", { role: "creator" });
}

export function trackBrandRegisterSuccess() {
  trackEvent("brand_register_success", { role: "brand" });
}

export function trackRoleRegisterSuccess(role: "creator" | "brand" | string) {
  trackEvent("role_register_success", { role });
}

export function trackCreatorApplyJob(campaignId: string) {
  trackEvent("creator_apply_job_success", { campaign_id: campaignId, job_id: campaignId });
}

export function trackBrandCreateCampaign(campaignId: string) {
  trackEvent("brand_create_campaign_success", { campaign_id: campaignId, job_id: campaignId });
}

export function trackProofSubmit(campaignId: string) {
  trackEvent("creator_submit_proof_success", { campaign_id: campaignId, job_id: campaignId });
}

export function trackProofApproved(campaignId: string) {
  trackEvent("proof_approved", { campaign_id: campaignId, job_id: campaignId });
}

export function trackOrderSuccess(orderId: string, revenue: number, brandId?: string, creatorId?: string) {
  trackEvent("order_success", {
    order_id: orderId,
    value: revenue,
    currency: "VND",
    brand_id: brandId,
    creator_id: creatorId
  });
}
