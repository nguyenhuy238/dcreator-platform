import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCreatorAnalyticsCsv } from "../lib/creator-analytics-csv.ts";
import type { CreatorAnalyticsOverview } from "../lib/services/creator-analytics.service.ts";

const sampleAnalytics: CreatorAnalyticsOverview = {
  generatedAt: "2026-07-09T00:00:00.000Z",
  filters: {
    from: null,
    to: null,
    campaignId: null
  },
  overview: {
    totalApplications: 1,
    approvedApplications: 1,
    rejectedApplications: 0,
    pendingApplications: 0,
    totalMissions: 1,
    acceptedMissions: 1,
    submittedProofs: 1,
    approvedProofs: 1,
    rejectedProofs: 0,
    pendingReviews: 0,
    completedCampaigns: 0,
    activeCampaigns: 1
  },
  funnel: {
    applications: 1,
    approvedApplications: 1,
    assignedMissions: 1,
    acceptedMissions: 1,
    proofSubmitted: 1,
    proofApproved: 1,
    proofRejected: 0,
    rewardCredited: 1,
    applicationApprovalRate: 100,
    proofApprovalRate: 100,
    missionCompletionRate: 100
  },
  earnings: {
    commissionCreditedVnd: 250000,
    payoutRequestedVnd: 0,
    payoutPaidVnd: 0,
    payoutPendingVnd: 0,
    unknownPaymentTransactionsVnd: 0
  },
  pendingActions: {
    pendingApplications: 0,
    missionsToAccept: 0,
    proofsToSubmit: 0,
    pendingProofReview: 0,
    rejectedProofsToRevise: 0,
    pendingPayouts: 0
  },
  campaignPerformance: [
    {
      campaignId: "campaign_1",
      title: "Creator, \"Launch\"",
      status: "ACTIVE",
      brandName: "Brand A",
      applicationStatus: "APPROVED",
      missionStatus: "COMPLETED",
      proofStatus: "DONE",
      approvedProofs: 1,
      rejectedProofs: 0,
      completionRate: 100,
      commissionCreditedVnd: 250000
    }
  ],
  recentActivity: []
};

test("buildCreatorAnalyticsCsv exports campaign performance rows", () => {
  const csv = buildCreatorAnalyticsCsv("campaignPerformance", sampleAnalytics);

  assert.match(csv, /Campaign ID,Campaign Title,Status/);
  assert.match(csv, /campaign_1,"Creator, ""Launch""",ACTIVE/);
});

test("buildCreatorAnalyticsCsv exports funnel rows", () => {
  const csv = buildCreatorAnalyticsCsv("funnel", sampleAnalytics);

  assert.match(csv, /Applications,1/);
  assert.match(csv, /Mission Completion Rate,100/);
});

test("buildCreatorAnalyticsCsv exports pending action rows", () => {
  const csv = buildCreatorAnalyticsCsv("pendingActions", sampleAnalytics);

  assert.match(csv, /Missions To Accept,0/);
  assert.match(csv, /Pending Payouts,0/);
});
