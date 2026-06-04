export type PerformanceStatus = "excellent" | "good" | "average" | "risky";

export type CreatorPerformanceSortKey =
  | "score-desc"
  | "revenue-desc"
  | "completed-campaigns-desc"
  | "approval-rate-desc";

export type CreatorPerformanceInput = {
  id: string;
  status?: string | null;
  verificationStatus?: string | null;
  riskFlag?: boolean | null;
  displayName?: string | null;
  mainPlatform?: string | null;
  socialUrl?: string | null;
  handle?: string | null;
  campaignCount?: number | null;
  completedCampaigns?: number | null;
  missionSubmitted?: number | null;
  missionApproved?: number | null;
  approvedMissions?: number | null;
  payoutCount?: number | null;
  totalPayout?: number | null;
  commissionTotal?: number | null;
  transactionTotal?: number | null;
  totalRevenueGenerated?: number | null;
  averageCampaignPerformanceScore?: number | null;
  lastActivityDate?: string | null;
  createdAt?: string | null;
  account?: { email?: string | null; displayName?: string | null } | null;
};

export type CreatorPerformance = {
  id: string;
  rank: number;
  name: string;
  contact: string;
  socialHandle: string;
  totalCampaignsJoined: number;
  completedCampaigns: number;
  missionSubmitted: number;
  missionApproved: number;
  approvalRate: number;
  totalRevenueGenerated: number;
  totalPayout: number;
  averageCampaignPerformanceScore: number;
  score: number;
  status: PerformanceStatus;
  lastActivityDate: string | null;
};

function safeNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

export function getCreatorPerformanceStatus(score: number): PerformanceStatus {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "average";
  return "risky";
}

export function calculateCreatorPerformance(item: CreatorPerformanceInput): CreatorPerformance {
  const totalCampaignsJoined = safeNumber(item.campaignCount);
  const completedCampaigns = safeNumber(item.completedCampaigns);
  const missionSubmitted = safeNumber(item.missionSubmitted);
  const missionApproved = safeNumber(item.missionApproved ?? item.approvedMissions);
  const totalRevenueGenerated = safeNumber(item.totalRevenueGenerated ?? item.transactionTotal);
  const totalPayout = safeNumber(item.totalPayout ?? item.commissionTotal);
  const approvalRate = missionSubmitted > 0 ? Math.round((missionApproved / missionSubmitted) * 100) : 0;
  const revenueScore = Math.min(totalRevenueGenerated / 1_000_000, 30);
  const payoutScore = Math.min(totalPayout / 500_000, 20);
  const normalizedStatus = (item.status ?? "").toLowerCase();
  const riskPenalty = item.riskFlag || normalizedStatus === "suspended" ? 20 : 0;
  const score = Math.max(0, Math.round(completedCampaigns * 25 + missionApproved * 10 + revenueScore + payoutScore - riskPenalty));

  return {
    id: item.id,
    rank: 0,
    name: item.displayName || item.account?.displayName || "-",
    contact: item.account?.email || "-",
    socialHandle: item.handle || item.socialUrl || item.mainPlatform || "-",
    totalCampaignsJoined,
    completedCampaigns,
    missionSubmitted,
    missionApproved,
    approvalRate,
    totalRevenueGenerated,
    totalPayout,
    averageCampaignPerformanceScore: safeNumber(item.averageCampaignPerformanceScore ?? score),
    score,
    status: getCreatorPerformanceStatus(score),
    lastActivityDate: item.lastActivityDate || item.createdAt || null
  };
}

export function sortCreatorPerformance(items: CreatorPerformance[], sortKey: CreatorPerformanceSortKey) {
  const sorted = [...items].sort((a, b) => {
    if (sortKey === "revenue-desc") return b.totalRevenueGenerated - a.totalRevenueGenerated;
    if (sortKey === "completed-campaigns-desc") return b.completedCampaigns - a.completedCampaigns;
    if (sortKey === "approval-rate-desc") return b.approvalRate - a.approvalRate;
    return b.score - a.score;
  });

  return sorted.map((item, index) => ({ ...item, rank: index + 1 }));
}
