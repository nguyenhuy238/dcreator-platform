import type { AnalyticsEventInput } from "@/lib/validators/analytics";

const SESSION_KEY = "dcreator.analytics.session_id";

function getSessionId() {
  if (typeof window === "undefined") return "server-session";
  const current = window.localStorage.getItem(SESSION_KEY);
  if (current) return current;
  const next = crypto.randomUUID();
  window.localStorage.setItem(SESSION_KEY, next);
  return next;
}

export async function trackEvent(
  event: Omit<AnalyticsEventInput, "sessionId"> & { sessionId?: string }
) {
  const payload: AnalyticsEventInput = {
    ...event,
    sessionId: event.sessionId ?? getSessionId()
  };

  await fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true
  });
}
