export type BrandSubscriptionPackageCode = "FREE" | "UGC_15_VIDEO" | "UGC_50_VIDEO";

export type BrandSubscriptionPackageDefinition = {
  code: BrandSubscriptionPackageCode;
  name: string;
  pricePoints: number;
  summary: string;
  features: string[];
  specialTitle?: string;
  specialIntro?: string;
  specialFeatures?: string[];
};

export const BRAND_SUBSCRIPTION_PACKAGES: BrandSubscriptionPackageDefinition[] = [
  {
    code: "FREE",
    name: "Gói Free",
    pricePoints: 0,
    summary: "Khởi động, test hiệu quả creator marketing với chi phí thấp.",
    features: [],
    specialTitle: "ĐẶC BIỆT(không khả dụng)",
    specialIntro: "25 Brands đầu tiên sẽ được:",
    specialFeatures: [
      "Tặng miễn phí 20 video UGC / Brand",
      "Tổng chương trình hỗ trợ lên đến 500 video",
      "Creator phù hợp theo ngành hàng và sản phẩm",
      "Nội dung tối ưu TikTok Shop và Social Commerce"
    ]
  },
  {
    code: "UGC_15_VIDEO",
    name: "UGC - Gói 15 Video",
    pricePoints: 5_000_000,
    summary: "15 video review sản phẩm/dịch vụ với creator trên hệ thống.",
    features: [
      "Creator đăng ký tham gia và được lọc theo tiêu chí Brand",
      "Mỗi video là nội dung UGC theo brief campaign",
      "Đặt hàng tăng lượt bán shop",
      "Đăng lên kênh cá nhân của creators",
      "Đánh giá 5 sao và viết nhận xét sản phẩm",
      "Cấp mã quảng cáo video để brand chạy quảng cáo",
      "4 giờ livestream bán hàng trên kênh của Brand"
    ]
  },
  {
    code: "UGC_50_VIDEO",
    name: "UGC - Gói 50 Video",
    pricePoints: 12_000_000,
    summary: "Gói mở rộng cho chiến dịch phủ rộng nội dung UGC.",
    features: [
      "Bao gồm toàn bộ quyền lợi của gói UGC - Gói 15 Video",
      "Bao gồm 50 video UGC cho sản phẩm/dịch vụ",
      "Có thể kết hợp hàng/tiền hàng/voucher theo campaign",
      "Phù hợp mục tiêu scale nhận diện và chuyển đổi"
    ]
  }
];

export const BRAND_SUBSCRIPTION_PACKAGE_RANK: Record<BrandSubscriptionPackageCode, number> = {
  FREE: 0,
  UGC_15_VIDEO: 1,
  UGC_50_VIDEO: 2
};

export const BRAND_SUBSCRIPTION_PACKAGE_MAP: Record<BrandSubscriptionPackageCode, BrandSubscriptionPackageDefinition> = {
  FREE: BRAND_SUBSCRIPTION_PACKAGES[0]!,
  UGC_15_VIDEO: BRAND_SUBSCRIPTION_PACKAGES[1]!,
  UGC_50_VIDEO: BRAND_SUBSCRIPTION_PACKAGES[2]!
};

export const BRAND_SUBSCRIPTION_PACKAGE_VIDEO_QUOTA: Record<BrandSubscriptionPackageCode, number> = {
  FREE: 0,
  UGC_15_VIDEO: 15,
  UGC_50_VIDEO: 50
};

