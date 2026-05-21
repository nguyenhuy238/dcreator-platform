export type DCreatorActor = "supporter" | "creator" | "brand" | "admin";

export const dCreatorUxRules: Record<DCreatorActor, string[]> = {
  supporter: [
    "Ưu tiên luồng nhanh khám phá campaign -> hiểu bối cảnh -> Ủng hộ.",
    "Luôn hiển thị minh bạch mục tiêu, tiến độ, proof và lịch sử hỗ trợ.",
    "Sau mỗi thao tác thành công phải có phản hồi rõ và bước tiếp theo.",
  ],
  creator: [
    "Ưu tiên trải nghiệm mission funnel, reward funnel và payout.",
    "Cảnh báo rõ khi thiếu hồ sơ hoặc proof để tránh fail submission.",
    "Trạng thái nhiệm vụ dùng badge màu trực quan, dễ quét trên mobile.",
  ],
  brand: [
    "Tập trung campaign budget, creator performance và reward inventory.",
    "KPI quan trọng xuất hiện trước: spend, conversion, completion.",
    "CTA vận hành rõ ràng theo context: Tham gia, Nhận reward, Xem voucher.",
  ],
  admin: [
    "Ưu tiên moderation, chống gian lận, audit traceability.",
    "Mọi thao tác rủi ro cao cần modal xác nhận và lý do.",
    "Error message phải kèm trace/request id để điều tra nhanh.",
  ],
};

export const dCreatorAsyncStates = ["loading", "empty", "error", "success"] as const;

export const dCreatorPrimaryCtas = ["Ủng hộ", "Đổi quà", "Tham gia", "Nhận reward", "Xem voucher"] as const;
