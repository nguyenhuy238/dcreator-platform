import type { PerformanceStatus } from "./creatorPerformance";

export type BrandPerformanceSortKey = "score-desc" | "revenue-desc" | "campaigns-desc" | "credit-balance-desc";

export type BrandPerformanceInput = {
  id: string;
  status?: string | null;
  verificationStatus?: string | null;
  riskFlag?: boolean | null;
  isLocked?: boolean | null;
  brandName?: string | null;
  name?: string | null;
  contactEmail?: string | null;
  industry?: string | null;
  campaignCount?: number | null;
  activeCampaigns?: number | null;
  completedCampaigns?: number | null;
  productCount?: number | null;
  transactionCount?: number | null;
  totalTransactions?: number | null;
  transactionTotal?: number | null;
  totalRevenue?: number | null;
  creditBalance?: number | null;
  platformFeeGenerated?: number | null;
  payoutTotal?: number | null;
  averageCampaignRoi?: number | null;
  averageCampaignPerformanceScore?: number | null;
  lastActivityDate?: string | null;
  createdAt?: string | null;
  account?: { email?: string | null; displayName?: string | null } | null;
};

export type BrandPerformance = {
  id: string;
  rank: number;
  name: string;
  ownerEmail: string;
  totalCampaignsCreated: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalProducts: number;
  totalTransactions: number;
  totalRevenue: number;
  creditBalance: number;
  platformFeeGenerated: number;
  averageCampaignPerformanceScore: number;
  score: number;
  status: PerformanceStatus;
  lastActivityDate: string | null;
};

function safeNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

export function getBrandPerformanceStatus(score: number): PerformanceStatus {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "average";
  return "risky";
}

export function calculateBrandPerformance(item: BrandPerformanceInput): BrandPerformance {
  const totalCampaignsCreated = safeNumber(item.campaignCount);
  const normalizedStatus = (item.status ?? "").toLowerCase();
  const activeCampaigns = safeNumber(item.activeCampaigns ?? (normalizedStatus === "active" ? totalCampaignsCreated : 0));
  const completedCampaigns = safeNumber(item.completedCampaigns);
  const totalProducts = safeNumber(item.productCount);
  const totalTransactions = safeNumber(item.totalTransactions ?? item.transactionCount);
  const totalRevenue = safeNumber(item.totalRevenue ?? item.transactionTotal);
  const creditBalance = safeNumber(item.creditBalance);
  const platformFeeGenerated = safeNumber(item.platformFeeGenerated ?? item.payoutTotal);
  const revenueScore = Math.min(totalRevenue / 1_000_000, 30);
  const productScore = Math.min(totalProducts * 2, 20);
  const creditScore = creditBalance > 0 ? 10 : -10;
  const riskPenalty = item.riskFlag || item.isLocked || normalizedStatus === "locked" ? 20 : 0;
  const score = Math.max(0, Math.round(completedCampaigns * 20 + activeCampaigns * 10 + revenueScore + productScore + creditScore - riskPenalty));

  return {
    id: item.id,
    rank: 0,
    name: item.brandName || item.name || "-",
    ownerEmail: item.account?.email || item.contactEmail || "-",
    totalCampaignsCreated,
    activeCampaigns,
    completedCampaigns,
    totalProducts,
    totalTransactions,
    totalRevenue,
    creditBalance,
    platformFeeGenerated,
    averageCampaignPerformanceScore: safeNumber(item.averageCampaignPerformanceScore ?? item.averageCampaignRoi ?? score),
    score,
    status: getBrandPerformanceStatus(score),
    lastActivityDate: item.lastActivityDate || item.createdAt || null
  };
}

export function sortBrandPerformance(items: BrandPerformance[], sortKey: BrandPerformanceSortKey) {
  const sorted = [...items].sort((a, b) => {
    if (sortKey === "revenue-desc") return b.totalRevenue - a.totalRevenue;
    if (sortKey === "campaigns-desc") return b.totalCampaignsCreated - a.totalCampaignsCreated;
    if (sortKey === "credit-balance-desc") return b.creditBalance - a.creditBalance;
    return b.score - a.score;
  });

  return sorted.map((item, index) => ({ ...item, rank: index + 1 }));
}
