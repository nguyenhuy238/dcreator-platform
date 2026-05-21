export type ContributionResultDTO = {
  contributionId: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  paymentUrl: string | null;
  voucher: { code: string; rewardTitle: string } | null;
};
