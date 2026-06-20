export type CampaignItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover: string;
  status: "active" | "review" | "ended" | "full";
  campaignType: "Video seeding";
  brand: string;
  creator: string;
  fundedAmount: number;
  targetAmount: number;
  backers: number;
  rewardsLeft: number;
  daysLeft: number;
};

export const mockCampaigns: CampaignItem[] = [
  {
    id: "c1", slug: "freshskin-summer-creator-boost", title: "UGC 20 video - Sữa hạt X cho Gen Z", description: "Video seeding ra mắt sản phẩm mới, tập trung TikTok + Shopee.", cover: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1200&q=80", status: "active", campaignType: "Video seeding", brand: "FreshSkin", creator: "Linh Beauty", fundedAmount: 185000000, targetAmount: 250000000, backers: 928, rewardsLeft: 312, daysLeft: 14
  },
  {
    id: "c2", slug: "snackgo-campus-challenge", title: "SnackGo Campus Video Seeding", description: "Chiến dịch video review chân thực cho tệp sinh viên.", cover: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80", status: "active", campaignType: "Video seeding", brand: "SnackGo", creator: "Trang Daily", fundedAmount: 96000000, targetAmount: 120000000, backers: 516, rewardsLeft: 108, daysLeft: 8
  },
  {
    id: "c3", slug: "fitplus-voucher-drop", title: "FitPlus Creator Video Seeding", description: "Chuỗi video seeding tăng đơn gói tập luyện online.", cover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80", status: "ended", campaignType: "Video seeding", brand: "FitPlus", creator: "Coach Nam", fundedAmount: 210000000, targetAmount: 210000000, backers: 1204, rewardsLeft: 0, daysLeft: 0
  }
];
