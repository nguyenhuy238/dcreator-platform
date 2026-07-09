import assert from "node:assert/strict";
import test from "node:test";
import { escapeCsvCell, rowsToCsv } from "../lib/csv.ts";
import { buildAdminAnalyticsCsv } from "../lib/admin-analytics-csv.ts";

const sampleAnalytics = {
  generatedAt: "2026-07-09T00:00:00.000Z",
  filters: { from: null, to: null, brandId: null, campaignId: null },
  overview: {
    totalCampaigns: 1,
    activeCampaigns: 1,
    completedCampaigns: 0,
    draftCampaigns: 0,
    cancelledCampaigns: 0,
    totalBrandCampaignRequests: 0,
    pendingBrandCampaignRequests: 0,
    approvedBrandCampaignRequests: 0,
    rejectedBrandCampaignRequests: 0
  },
  funnel: {
    totalCreatorMissions: 2,
    applications: 2,
    approvedApplications: 1,
    rejectedApplications: 0,
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
    pendingProofs: 2,
    pendingVideoReviews: 3,
    pendingFinalReviews: 4,
    pendingPayouts: 5
  },
  payments: {
    commissionCreditedVnd: 100000,
    payoutRequestedVnd: 0,
    payoutPaidVnd: 0,
    payoutPendingVnd: 0,
    paymentTransactionsSucceededVnd: 0,
    paymentTransactionsPendingVnd: 0,
    paymentTransactionsFailedVnd: 0
  },
  topCreators: [
    {
      creatorId: "creator_1",
      accountId: "account_1",
      displayName: "Creator, \"One\"",
      approvedMissions: 1,
      submittedProofs: 2,
      approvedProofs: 1,
      rejectedProofs: 1,
      completionRate: 50,
      commissionCreditedVnd: 100000
    }
  ],
  campaignPerformance: [
    {
      campaignId: "campaign_1",
      title: "Campaign, \"Alpha\"",
      status: "ACTIVE",
      brandId: "brand_1",
      brandName: "Brand One",
      totalCreatorMissions: 2,
      approvedApplications: 1,
      submittedProofs: 2,
      approvedProofs: 1,
      rejectedProofs: 1,
      completionRate: 50,
      commissionCreditedVnd: 100000
    }
  ]
};

test("escapeCsvCell escapes commas, quotes, and new lines", () => {
  assert.equal(escapeCsvCell("plain"), "plain");
  assert.equal(escapeCsvCell("A,B"), "\"A,B\"");
  assert.equal(escapeCsvCell("A \"quoted\" value"), "\"A \"\"quoted\"\" value\"");
  assert.equal(escapeCsvCell("A\nB"), "\"A\nB\"");
});

test("rowsToCsv joins rows with CRLF", () => {
  assert.equal(rowsToCsv([["A", "B"], [1, "C,D"]]), "A,B\r\n1,\"C,D\"");
});

test("buildAdminAnalyticsCsv exports campaign performance rows", () => {
  const csv = buildAdminAnalyticsCsv("campaignPerformance", sampleAnalytics);
  assert.match(csv, /Mã chiến dịch,Tên chiến dịch,Trạng thái/);
  assert.match(csv, /campaign_1,"Campaign, ""Alpha""",ACTIVE/);
});

test("buildAdminAnalyticsCsv exports top creators rows", () => {
  const csv = buildAdminAnalyticsCsv("topCreators", sampleAnalytics);
  assert.match(csv, /Mã nhà sáng tạo,Mã tài khoản,Tên hiển thị/);
  assert.match(csv, /creator_1,account_1,"Creator, ""One"""/);
});
