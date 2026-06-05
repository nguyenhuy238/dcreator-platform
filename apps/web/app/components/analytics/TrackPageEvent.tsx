"use client";

import { useEffect } from "react";
import { trackEvent, type GtagEventParams } from "@/lib/analytics";
import type { AnalyticsEventName } from "@/lib/analytics-events";

export function TrackPageEvent({
  eventName,
  params
}: {
  eventName: AnalyticsEventName;
  params?: GtagEventParams;
}) {
  useEffect(() => {
    trackEvent(eventName, params);
  }, [eventName, params]);

  return null;
}
