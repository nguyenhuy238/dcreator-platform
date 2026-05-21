export type CampaignItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover: string;
  status: "active" | "review" | "ended" | "full";
  campaignType: "Sponsorship" | "Voucher" | "Product Launch";
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
    id: "c1", slug: "freshskin-summer-creator-boost", title: "FreshSkin Summer Creator Boost", description: "Chương trình tài trợ video review + voucher mùa hè.", cover: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1200&q=80", status: "active", campaignType: "Sponsorship", brand: "FreshSkin", creator: "Linh Beauty", fundedAmount: 185000000, targetAmount: 250000000, backers: 928, rewardsLeft: 312, daysLeft: 14
  },
  {
    id: "c2", slug: "snackgo-campus-challenge", title: "SnackGo Campus Challenge", description: "Social commerce challenge dành cho creator lifestyle.", cover: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80", status: "active", campaignType: "Product Launch", brand: "SnackGo", creator: "Trang Daily", fundedAmount: 96000000, targetAmount: 120000000, backers: 516, rewardsLeft: 108, daysLeft: 8
  },
  {
    id: "c3", slug: "fitplus-voucher-drop", title: "FitPlus Voucher Drop", description: "Ủng hộ nhận voucher tập luyện và quà member kit.", cover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80", status: "ended", campaignType: "Voucher", brand: "FitPlus", creator: "Coach Nam", fundedAmount: 210000000, targetAmount: 210000000, backers: 1204, rewardsLeft: 0, daysLeft: 0
  }
];
