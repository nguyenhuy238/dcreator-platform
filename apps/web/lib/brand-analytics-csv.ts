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
        "Mã chiến dịch",
        "Tên chiến dịch",
        "Trạng thái",
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
        "Mã nhà sáng tạo",
        "Mã tài khoản",
        "Tên hiển thị",
        "Số chiến dịch",
        "Nhiệm vụ đã duyệt",
        "Minh chứng đã nộp",
        "Minh chứng đã duyệt",
        "Minh chứng bị từ chối",
        "Tỷ lệ hoàn thành",
        "Hoa hồng đã ghi nhận (VNĐ)"
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
      ["Chỉ số", "Giá trị"],
      ["Lượt ứng tuyển", data.funnel.applications],
      ["Ứng tuyển đã duyệt", data.funnel.approvedApplications],
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

  return rowsToCsv([
    ["Hàng chờ", "Số lượng"],
    ["Ứng tuyển chờ duyệt", data.pendingReview.pendingApplications],
    ["Minh chứng chờ duyệt", data.pendingReview.pendingProofs],
    ["Video chờ duyệt", data.pendingReview.pendingVideoReviews],
    ["Duyệt cuối chờ xử lý", data.pendingReview.pendingFinalReviews],
    ["Rút tiền chờ xử lý", data.pendingReview.pendingPayouts]
  ]);
}
