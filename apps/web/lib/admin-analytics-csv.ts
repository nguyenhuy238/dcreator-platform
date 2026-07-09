type CsvCell = string | number | boolean | null | undefined;

type AdminAnalyticsCsvData = {
  funnel: {
    totalCreatorMissions: number;
    applications: number;
    approvedApplications: number;
    rejectedApplications: number;
    assignedMissions: number;
    acceptedMissions: number;
    proofSubmitted: number;
    proofApproved: number;
    proofRejected: number;
    rewardCredited: number;
    applicationApprovalRate: number;
    proofApprovalRate: number;
    missionCompletionRate: number;
  };
  pendingReview: {
    pendingApplications: number;
    pendingProofs: number;
    pendingVideoReviews: number;
    pendingFinalReviews: number;
    pendingPayouts: number;
  };
  topCreators: Array<{
    creatorId: string;
    accountId: string | null;
    displayName: string;
    approvedMissions: number;
    submittedProofs: number;
    approvedProofs: number;
    rejectedProofs: number;
    completionRate: number;
    commissionCreditedVnd: number;
  }>;
  campaignPerformance: Array<{
    campaignId: string;
    title: string;
    status: string;
    brandId: string | null;
    brandName: string | null;
    totalCreatorMissions: number;
    approvedApplications: number;
    submittedProofs: number;
    approvedProofs: number;
    rejectedProofs: number;
    completionRate: number;
    commissionCreditedVnd: number;
  }>;
};

function escapeCell(value: CsvCell) {
  if (value === null || typeof value === "undefined") return "";
  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function toCsv(rows: CsvCell[][]) {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

export type AdminAnalyticsExportType = "campaignPerformance" | "topCreators" | "funnel" | "pendingReview";

export function buildAdminAnalyticsCsv(type: AdminAnalyticsExportType, data: AdminAnalyticsCsvData) {
  if (type === "campaignPerformance") {
    return toCsv([
      [
        "Campaign ID",
        "Campaign Title",
        "Status",
        "Brand ID",
        "Brand Name",
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
        item.brandId,
        item.brandName,
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

  if (type === "topCreators") {
    return toCsv([
      [
        "Creator ID",
        "Account ID",
        "Display Name",
        "Approved Missions",
        "Submitted Proofs",
        "Approved Proofs",
        "Rejected Proofs",
        "Completion Rate",
        "Commission Credited VND"
      ],
      ...data.topCreators.map((item) => [
        item.creatorId,
        item.accountId,
        item.displayName,
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
    return toCsv([
      ["Metric", "Value"],
      ["Total Creator Missions", data.funnel.totalCreatorMissions],
      ["Applications", data.funnel.applications],
      ["Approved Applications", data.funnel.approvedApplications],
      ["Rejected Applications", data.funnel.rejectedApplications],
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

  return toCsv([
    ["Queue", "Value"],
    ["Pending Applications", data.pendingReview.pendingApplications],
    ["Pending Proofs", data.pendingReview.pendingProofs],
    ["Pending Video Reviews", data.pendingReview.pendingVideoReviews],
    ["Pending Final Reviews", data.pendingReview.pendingFinalReviews],
    ["Pending Payouts", data.pendingReview.pendingPayouts]
  ]);
}
