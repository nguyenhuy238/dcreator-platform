export type CampaignDetailDTO = {
  hero: {
    id: string;
    slug: string;
    title: string;
    description: string;
    coverMediaUrl: string | null;
    coverMediaType: "image" | "video";
    brand: string;
    creator: string | null;
    campaignType: "DONATION" | "PREORDER" | "SPONSORSHIP" | "COMMUNITY";
    category: "TECH" | "FASHION" | "FOOD" | "BEAUTY" | "LIFESTYLE" | "EDUCATION";
    benefits: string | null;
    participationRoadmap: string[];
    status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";
    deadline: string | null;
  };
  funding: {
    targetAmountVnd: number;
    fundedAmountVnd: number;
    progressPercent: number;
    backerCount: number;
    remainingTimeLabel: string;
    isEnded: boolean;
  };
  rewards: Array<{
    id: string;
    title: string;
    description: string;
    pricePoints: number;
    priceVnd: number | null;
    stockTotal: number;
    stockRemaining: number;
    estimatedDelivery: string;
    isOutOfStock: boolean;
  }>;
  missions: Array<{
    id: string;
    title: string;
    rewardPoints: number;
    deadline: string | null;
    eligibility: string;
    status: "OPEN" | "SUBMITTED" | "APPROVED" | "REJECTED";
  }>;
  timeline: {
    createdAt: string;
    approvedAt: string | null;
    milestoneUpdates: Array<{
      label: string;
      at: string;
    }>;
  };
  socialProof: {
    totalBackers: number;
    recentContributions: Array<{
      id: string;
      supporterMasked: string;
      amountVnd: number;
      contributedAt: string;
    }>;
  };
  faqPolicy: {
    rewardPolicy: string;
    refundPolicy: string;
    voucherUsage: string;
    campaignFailurePolicy: string;
  };
  viewer: {
    isLoggedIn: boolean;
    hasSupported: boolean;
  };
};
