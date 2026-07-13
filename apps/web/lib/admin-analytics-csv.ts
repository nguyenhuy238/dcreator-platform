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
        "Mã chiến dịch",
        "Tên chiến dịch",
        "Trạng thái",
        "Mã thương hiệu",
        "Tên thương hiệu",
        "Tổng nhiệm vụ creator",
        "Ứng tuyển đã duyệt",
        "Minh chứng đã nộp",
        "Minh chứng đã duyệt",
        "Minh chứng bị từ chối",
        "Tỷ lệ hoàn thành",
        "Hoa hồng đã ghi nhận (VNĐ)"
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
        "Mã nhà sáng tạo",
        "Mã tài khoản",
        "Tên hiển thị",
        "Nhiệm vụ đã duyệt",
        "Minh chứng đã nộp",
        "Minh chứng đã duyệt",
        "Minh chứng bị từ chối",
        "Tỷ lệ hoàn thành",
        "Hoa hồng đã ghi nhận (VNĐ)"
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
      ["Chỉ số", "Giá trị"],
      ["Tổng nhiệm vụ creator", data.funnel.totalCreatorMissions],
      ["Lượt ứng tuyển", data.funnel.applications],
      ["Ứng tuyển đã duyệt", data.funnel.approvedApplications],
      ["Ứng tuyển bị từ chối", data.funnel.rejectedApplications],
      ["Nhiệm vụ đã giao", data.funnel.assignedMissions],
      ["Nhiệm vụ đã nhận", data.funnel.acceptedMissions],
      ["Minh chứng đã nộp", data.funnel.proofSubmitted],
      ["Minh chứng đã duyệt", data.funnel.proofApproved],
      ["Minh chứng bị từ chối", data.funnel.proofRejected],
      ["Thưởng đã ghi nhận", data.funnel.rewardCredited],
      ["Tỷ lệ duyệt ứng tuyển", data.funnel.applicationApprovalRate],
      ["Tỷ lệ duyệt minh chứng", data.funnel.proofApprovalRate],
      ["Tỷ lệ hoàn thành nhiệm vụ", data.funnel.missionCompletionRate]
    ]);
  }

  return toCsv([
    ["Hàng chờ", "Số lượng"],
    ["Ứng tuyển chờ duyệt", data.pendingReview.pendingApplications],
    ["Minh chứng chờ duyệt", data.pendingReview.pendingProofs],
    ["Video chờ duyệt", data.pendingReview.pendingVideoReviews],
    ["Duyệt cuối chờ xử lý", data.pendingReview.pendingFinalReviews],
    ["Rút tiền chờ xử lý", data.pendingReview.pendingPayouts]
  ]);
}
