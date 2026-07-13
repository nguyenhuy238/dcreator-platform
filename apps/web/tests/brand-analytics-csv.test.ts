import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBrandAnalyticsCsv } from "../lib/brand-analytics-csv.ts";
import type { BrandAnalyticsOverview } from "../lib/services/brand-analytics.service.ts";

const sampleAnalytics: BrandAnalyticsOverview = {
  generatedAt: "2026-07-09T00:00:00.000Z",
  filters: {
    from: null,
    to: null,
    brandIds: ["brand_1"],
    campaignId: null
  },
  overview: {
    totalCampaigns: 1,
    activeCampaigns: 1,
    completedCampaigns: 0,
    draftCampaigns: 0,
    cancelledCampaigns: 0,
    totalApplications: 2,
    approvedApplications: 1,
    rejectedApplications: 0,
    pendingApplications: 1,
    totalCreatorMissions: 1,
    proofSubmitted: 1,
    proofApproved: 1,
    proofRejected: 0,
    pendingReviews: 1
  },
  funnel: {
    applications: 2,
    approvedApplications: 1,
    assignedMissions: 1,
    acceptedMissions: 1,
    proofSubmitted: 1,
    proofApproved: 1,
    proofRejected: 0,
    rewardCredited: 1,
    applicationApprovalRate: 50,
    proofApprovalRate: 100,
    missionCompletionRate: 100
  },
  pendingReview: {
    pendingApplications: 1,
    pendingProofs: 0,
    pendingVideoReviews: 0,
    pendingFinalReviews: 0,
    pendingPayouts: 0
  },
  payments: {
    commissionCreditedVnd: 250000,
    payoutRequestedVnd: 0,
    payoutPaidVnd: 0,
    payoutPendingVnd: 0
  },
  campaignPerformance: [
    {
      campaignId: "campaign_1",
      title: "Launch, \"Creator\"",
      status: "ACTIVE",
      totalCreatorMissions: 1,
      approvedApplications: 1,
      submittedProofs: 1,
      approvedProofs: 1,
      rejectedProofs: 0,
      completionRate: 100,
      commissionCreditedVnd: 250000
    }
  ],
  creatorPerformance: [
    {
      creatorId: "creator_1",
      accountId: "creator_1",
      displayName: "Creator A",
      avatarUrl: null,
      campaignCount: 1,
      approvedMissions: 1,
      submittedProofs: 1,
      approvedProofs: 1,
      rejectedProofs: 0,
      completionRate: 100,
      commissionCreditedVnd: 250000
    }
  ]
};

test("buildBrandAnalyticsCsv exports campaign performance rows", () => {
  const csv = buildBrandAnalyticsCsv("campaignPerformance", sampleAnalytics);

  assert.match(csv, /Mã chiến dịch,Tên chiến dịch,Trạng thái/);
  assert.match(csv, /campaign_1,"Launch, ""Creator""",ACTIVE/);
});

test("buildBrandAnalyticsCsv exports creator performance rows", () => {
  const csv = buildBrandAnalyticsCsv("creatorPerformance", sampleAnalytics);

  assert.match(csv, /Mã nhà sáng tạo,Mã tài khoản,Tên hiển thị/);
  assert.match(csv, /creator_1,creator_1,Creator A,1,1,1,1,0,100,250000/);
});

test("buildBrandAnalyticsCsv exports funnel rows", () => {
  const csv = buildBrandAnalyticsCsv("funnel", sampleAnalytics);

  assert.match(csv, /Lượt ứng tuyển,2/);
  assert.match(csv, /Tỷ lệ hoàn thành nhiệm vụ,100/);
});

test("buildBrandAnalyticsCsv exports pending review rows", () => {
  const csv = buildBrandAnalyticsCsv("pendingReview", sampleAnalytics);

  assert.match(csv, /Ứng tuyển chờ duyệt,1/);
  assert.match(csv, /Rút tiền chờ xử lý,0/);
});
