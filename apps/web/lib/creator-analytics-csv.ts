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
        "Mã chiến dịch",
        "Tên chiến dịch",
        "Trạng thái",
        "Tên thương hiệu",
        "Trạng thái ứng tuyển",
        "Trạng thái nhiệm vụ",
        "Trạng thái minh chứng",
        "Minh chứng đã duyệt",
        "Minh chứng bị từ chối",
        "Tỷ lệ hoàn thành",
        "Hoa hồng đã ghi nhận (VNĐ)"
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
    ["Ứng tuyển chờ duyệt", data.pendingActions.pendingApplications],
    ["Nhiệm vụ cần nhận", data.pendingActions.missionsToAccept],
    ["Minh chứng cần nộp", data.pendingActions.proofsToSubmit],
    ["Minh chứng chờ duyệt", data.pendingActions.pendingProofReview],
    ["Minh chứng cần chỉnh sửa", data.pendingActions.rejectedProofsToRevise],
    ["Rút tiền chờ xử lý", data.pendingActions.pendingPayouts]
  ]);
}
