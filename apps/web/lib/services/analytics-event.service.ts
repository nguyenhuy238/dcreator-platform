import { Prisma } from "@prisma/client";
import type { DcreatorAnalyticsEventName } from "@/lib/analytics-events";
import {
  buildDcreatorEventMetadata,
  resolveAnalyticsEventNameForDb
} from "@/lib/analytics-event-taxonomy";
import { prisma } from "@/lib/db";

type DbClient = Prisma.TransactionClient | typeof prisma;

export type TrackDcreatorEventInput = {
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
  client?: DbClient;
};

export async function trackDcreatorEvent(input: TrackDcreatorEventInput): Promise<void> {
  const eventName = resolveAnalyticsEventNameForDb(input.eventName);
  if (!eventName) {
    console.warn("[analytics] skipped unsupported dCreator event until AnalyticsEventName enum is extended", {
      eventName: input.eventName
    });
    return;
  }

  try {
    const client = input.client ?? prisma;
    await client.analyticsEvent.create({
      data: {
        eventName,
        userId: input.userId ?? input.accountId ?? input.actorId ?? null,
        sessionId: `srv_${input.actorId ?? input.accountId ?? input.userId ?? "system"}`,
        campaignId: input.campaignId ?? null,
        brandId: input.brandId ?? null,
        creatorId: input.creatorId ?? null,
        metadata: buildDcreatorEventMetadata(input) as Prisma.InputJsonObject
      }
    });
  } catch (error) {
    console.warn("[analytics] failed to track dCreator event", {
      eventName: input.eventName,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
