import type { CreatorAnalyticsOverview } from "@/lib/services/creator-analytics.service";

export type CreatorAnalyticsExportType = "campaignPerformance" | "funnel" | "pendingActions";

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

export function buildCreatorAnalyticsCsv(type: CreatorAnalyticsExportType, data: CreatorAnalyticsOverview) {
  if (type === "campaignPerformance") {
    return rowsToCsv([
      [
        "Campaign ID",
        "Campaign Title",
        "Status",
        "Brand Name",
        "Application Status",
        "Mission Status",
        "Proof Status",
        "Approved Proofs",
        "Rejected Proofs",
        "Completion Rate",
        "Commission Credited VND"
      ],
      ...data.campaignPerformance.map((item) => [
        item.campaignId,
        item.title,
        item.status,
        item.brandName,
        item.applicationStatus,
        item.missionStatus,
        item.proofStatus,
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
    ["Action", "Value"],
    ["Pending Applications", data.pendingActions.pendingApplications],
    ["Missions To Accept", data.pendingActions.missionsToAccept],
    ["Proofs To Submit", data.pendingActions.proofsToSubmit],
    ["Pending Proof Review", data.pendingActions.pendingProofReview],
    ["Rejected Proofs To Revise", data.pendingActions.rejectedProofsToRevise],
    ["Pending Payouts", data.pendingActions.pendingPayouts]
  ]);
}
