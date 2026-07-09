export type AnalyticsPaymentScope = {
  campaignIds?: string[];
  creatorAccountIds?: string[];
  brandAccountIds?: string[];
  from?: string;
  to?: string;
};

export type AnalyticsPaymentSummary = {
  commissionCreditedVnd: number;
  payoutRequestedVnd: number;
  payoutPaidVnd: number;
  payoutPendingVnd: number;
  paymentTransactionsSucceededVnd: number;
  paymentTransactionsPendingVnd: number;
  paymentTransactionsFailedVnd: number;
  unknownPaymentTransactionsVnd: number;
  payoutPendingCount: number;
  notes: string[];
};

export type AnalyticsPaymentTransactionRecord = {
  requestedAmountVnd: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  intent: string | null;
};

export type AnalyticsPayoutRecord = {
  amountVnd: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
};

export function createEmptyAnalyticsPaymentSummary(notes: string[] = []): AnalyticsPaymentSummary {
  return {
    commissionCreditedVnd: 0,
    payoutRequestedVnd: 0,
    payoutPaidVnd: 0,
    payoutPendingVnd: 0,
    paymentTransactionsSucceededVnd: 0,
    paymentTransactionsPendingVnd: 0,
    paymentTransactionsFailedVnd: 0,
    unknownPaymentTransactionsVnd: 0,
    payoutPendingCount: 0,
    notes
  };
}

export function addPlatformPayouts(summary: AnalyticsPaymentSummary, payouts: AnalyticsPayoutRecord[], options: { allowUnscopedPayouts: boolean }) {
  if (!options.allowUnscopedPayouts) {
    return {
      ...summary,
      notes: [...summary.notes, "PayoutRequest has no direct campaign/mission/brand reference; scoped payout metrics remain conservative."]
    };
  }

  return {
    ...summary,
    payoutRequestedVnd: payouts.reduce((sum, item) => sum + item.amountVnd, 0),
    payoutPaidVnd: payouts.filter((item) => item.status === "PAID").reduce((sum, item) => sum + item.amountVnd, 0),
    payoutPendingVnd: payouts.filter((item) => item.status === "PENDING" || item.status === "APPROVED").reduce((sum, item) => sum + item.amountVnd, 0),
    payoutPendingCount: payouts.filter((item) => item.status === "PENDING").length
  };
}

export function addPaymentTransactions(summary: AnalyticsPaymentSummary, transactions: AnalyticsPaymentTransactionRecord[]) {
  const next = { ...summary };

  for (const transaction of transactions) {
    next.unknownPaymentTransactionsVnd += transaction.requestedAmountVnd;
  }

  if (transactions.length > 0) {
    next.notes = [...next.notes, "PaymentTransaction intent is topup/contribution/brand fund or missing; excluded from core analytics payment totals."];
  }

  return next;
}
