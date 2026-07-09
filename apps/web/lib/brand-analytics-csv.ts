import type { BrandAnalyticsOverview } from "@/lib/services/brand-analytics.service";

export type BrandAnalyticsExportType = "campaignPerformance" | "creatorPerformance" | "funnel" | "pendingReview";

type CsvCell = string | number | boolean | null | undefined;

function escapeCell(value: CsvCell) {
  if (value === null || typeof value === "undefined") return "";
  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function rowsToCsv(rows: CsvCell[][]) {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

export function buildBrandAnalyticsCsv(type: BrandAnalyticsExportType, data: BrandAnalyticsOverview) {
  if (type === "campaignPerformance") {
    return rowsToCsv([
      [
        "Campaign ID",
        "Campaign Title",
        "Status",
        "Total Creator Missions",
        "Approved Applications",
        "Submitted Proofs",
        "Approved Proofs",
        "Rejected Proofs",
        "Completion Rate",
        "Commission Credited VND"
      ],
      ...data.campaignPerformance.map((item) => [
        item.campaignId,
        item.title,
        item.status,
        item.totalCreatorMissions,
        item.approvedApplications,
        item.submittedProofs,
        item.approvedProofs,
        item.rejectedProofs,
        item.completionRate,
        item.commissionCreditedVnd
      ])
    ]);
  }

  if (type === "creatorPerformance") {
    return rowsToCsv([
      [
        "Creator ID",
        "Account ID",
        "Display Name",
        "Campaign Count",
        "Approved Missions",
        "Submitted Proofs",
        "Approved Proofs",
        "Rejected Proofs",
        "Completion Rate",
        "Commission Credited VND"
      ],
      ...data.creatorPerformance.map((item) => [
        item.creatorId,
        item.accountId,
        item.displayName,
        item.campaignCount,
        item.approvedMissions,
        item.submittedProofs,
        item.approvedProofs,
        item.rejectedProofs,
        item.completionRate,
        item.commissionCreditedVnd
      ])
    ]);
  }

  if (type === "funnel") {
    return rowsToCsv([
      ["Metric", "Value"],
      ["Applications", data.funnel.applications],
      ["Approved Applications", data.funnel.approvedApplications],
      ["Assigned Missions", data.funnel.assignedMissions],
      ["Accepted Missions", data.funnel.acceptedMissions],
      ["Proof Submitted", data.funnel.proofSubmitted],
      ["Proof Approved", data.funnel.proofApproved],
      ["Proof Rejected", data.funnel.proofRejected],
      ["Reward Credited", data.funnel.rewardCredited],
      ["Application Approval Rate", data.funnel.applicationApprovalRate],
      ["Proof Approval Rate", data.funnel.proofApprovalRate],
      ["Mission Completion Rate", data.funnel.missionCompletionRate]
    ]);
  }

  return rowsToCsv([
    ["Queue", "Value"],
    ["Pending Applications", data.pendingReview.pendingApplications],
    ["Pending Proofs", data.pendingReview.pendingProofs],
    ["Pending Video Reviews", data.pendingReview.pendingVideoReviews],
    ["Pending Final Reviews", data.pendingReview.pendingFinalReviews],
    ["Pending Payouts", data.pendingReview.pendingPayouts]
  ]);
}
