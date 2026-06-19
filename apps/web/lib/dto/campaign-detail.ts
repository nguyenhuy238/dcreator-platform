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
    fulfillmentMode: "BRAND_SHIP" | "CREATOR_ORDER";
    creatorDepositRequired: boolean;
    category: "TECH" | "FASHION" | "FOOD" | "BEAUTY" | "LIFESTYLE" | "EDUCATION";
    objective: string | null;
    benefits: string | null;
    requirementsSummary: string | null;
    requirements: string | null;
    participationRoadmap: string[];
    requiredHashtags: string[];
    status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
    deadline: string | null;
    product: {
      name: string | null;
      description: string | null;
      imageUrl: string | null;
      link: string | null;
    };
  };
  funding: {
    targetAmountVnd: number;
    fundedAmountVnd: number;
    progressPercent: number;
    backerCount: number;
    remainingTimeLabel: string;
    isEnded: boolean;
  };
  videoStats: {
    targetVideos: number;
    approvedVideos: number;
    creatorJoined: number;
    remainingSlots: number;
    completionPercent: number;
    isQuotaReached: boolean;
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
    description: string;
    audience: "CREATOR" | "USER";
    productReceiveOption: "PRODUCT_REQUIRED" | "NO_PRODUCT_REQUIRED";
    productName: string | null;
    productDescription: string | null;
    productImageUrl: string | null;
    productLink: string | null;
    allowRepeat: boolean;
    rewardPoints: number;
    deadline: string | null;
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
