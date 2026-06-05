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
