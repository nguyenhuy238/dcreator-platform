export const CAMPAIGN_FULFILLMENT_MODES = ["BRAND_SHIP", "CREATOR_ORDER"] as const;

export type CampaignFulfillmentMode = (typeof CAMPAIGN_FULFILLMENT_MODES)[number];

export type CampaignParticipationStep = {
  title: string;
  description: string;
};

export const CAMPAIGN_FULFILLMENT_OPTIONS: Array<{
  value: CampaignFulfillmentMode;
  label: string;
  description: string;
}> = [
  {
    value: "BRAND_SHIP",
    label: "Brand tự gửi hàng cho Creator được duyệt",
    description:
      "Brand tự gửi hàng mẫu cho Creator sau khi Creator được duyệt tham gia. Creator nhận sản phẩm và thực hiện video theo brief. Brand tự chịu phí ship."
  },
  {
    value: "CREATOR_ORDER",
    label: "Brand ứng tiền hàng + ship cho dCreator",
    description:
      "Brand ứng trước tiền hàng và phí ship 20.000đ/đơn cho dCreator. Creator sẽ tự đặt mua sản phẩm qua sàn, nhận hàng, đánh giá 5 sao và thực hiện nội dung. Brand chỉ chịu phí sàn theo nền tảng bán hàng."
  }
];

export function normalizeCampaignFulfillmentMode(
  value: CampaignFulfillmentMode | null | undefined
): CampaignFulfillmentMode {
  return value === "CREATOR_ORDER" ? "CREATOR_ORDER" : "BRAND_SHIP";
}

export function getCampaignParticipationSteps(
  mode: CampaignFulfillmentMode | null | undefined
): CampaignParticipationStep[] {
  const fulfillmentMode = normalizeCampaignFulfillmentMode(mode);

  return [
    {
      title: "ĐĂNG KÝ THAM GIA",
      description: "Tạo hồ sơ Creator và kết nối kênh mạng xã hội."
    },
    {
      title: "CHỌN CAMPAIGN",
      description: "Khám phá chiến dịch phù hợp và gửi đăng ký tham gia."
    },
    fulfillmentMode === "CREATOR_ORDER"
      ? {
          title: "ĐẶT SẢN PHẨM",
          description: "Sau khi được duyệt, Creator đặt mua sản phẩm theo hướng dẫn để đơn hàng đi qua sàn."
        }
      : {
          title: "NHẬN SẢN PHẨM",
          description: "Được Brand phê duyệt và nhận sản phẩm hoặc reward trải nghiệm."
        },
    {
      title: "TẠO & ĐĂNG NỘI DUNG",
      description: "Sản xuất video review và đăng tải lên nền tảng Social Commerce."
    },
    fulfillmentMode === "CREATOR_ORDER"
      ? {
          title: "ĐÁNH GIÁ SẢN PHẨM & NHẬN THU NHẬP",
          description: "Đánh giá sản phẩm theo yêu cầu campaign, nộp proof và nhận hoa hồng/thu nhập sau khi được duyệt."
        }
      : {
          title: "ĐÁNH GIÁ SẢN PHẨM & NHẬN THU NHẬP",
          description:
            "Hoàn tất yêu cầu đánh giá sản phẩm, nộp proof và nhận hoa hồng/thu nhập theo chính sách campaign."
        }
  ];
}
