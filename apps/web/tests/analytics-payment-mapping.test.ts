import assert from "node:assert/strict";
import { test } from "node:test";
import { addPaymentTransactions, addPlatformPayouts, addScopedPayouts, createEmptyAnalyticsPaymentSummary } from "../lib/analytics-payment-mapping.ts";

test("empty analytics payment summary does not produce NaN", () => {
  const summary = createEmptyAnalyticsPaymentSummary();

  assert.equal(summary.commissionCreditedVnd, 0);
  assert.equal(summary.payoutPendingVnd, 0);
  assert.equal(Number.isNaN(summary.unknownPaymentTransactionsVnd), false);
});

test("scoped payout remains conservative without direct campaign reference", () => {
  const summary = addPlatformPayouts(
    createEmptyAnalyticsPaymentSummary(),
    [
      { amountVnd: 100000, status: "PENDING" },
      { amountVnd: 250000, status: "PAID" }
    ],
    { allowUnscopedPayouts: false }
  );

  assert.equal(summary.payoutRequestedVnd, 0);
  assert.equal(summary.payoutPaidVnd, 0);
  assert.equal(summary.payoutPendingVnd, 0);
  assert.match(summary.notes.join(" "), /no direct campaign\/mission\/brand reference/);
});

test("platform payout can be aggregated when scope is unscoped", () => {
  const summary = addPlatformPayouts(
    createEmptyAnalyticsPaymentSummary(),
    [
      { amountVnd: 100000, status: "PENDING" },
      { amountVnd: 250000, status: "PAID" }
    ],
    { allowUnscopedPayouts: true }
  );

  assert.equal(summary.payoutRequestedVnd, 350000);
  assert.equal(summary.payoutPaidVnd, 250000);
  assert.equal(summary.payoutPendingVnd, 100000);
  assert.equal(summary.payoutPendingCount, 1);
});

test("unknown payment intent is not added to core transaction metrics", () => {
  const summary = addPaymentTransactions(createEmptyAnalyticsPaymentSummary(), [
    { requestedAmountVnd: 100000, status: "SUCCESS", intent: "TOPUP_NPOINTS" },
    { requestedAmountVnd: 50000, status: "PENDING", intent: null }
  ]);

  assert.equal(summary.paymentTransactionsSucceededVnd, 0);
  assert.equal(summary.paymentTransactionsPendingVnd, 0);
  assert.equal(summary.paymentTransactionsFailedVnd, 0);
  assert.equal(summary.unknownPaymentTransactionsVnd, 150000);
});

test("brand scoped payout with matching campaignId is included", () => {
  const summary = addScopedPayouts(
    createEmptyAnalyticsPaymentSummary(),
    [
      { amountVnd: 100000, status: "PENDING", campaignId: "campaign_a" },
      { amountVnd: 250000, status: "PAID", campaignId: "campaign_b" }
    ],
    ["campaign_a"],
    new Map()
  );

  assert.equal(summary.payoutRequestedVnd, 100000);
  assert.equal(summary.payoutPendingVnd, 100000);
  assert.equal(summary.payoutPaidVnd, 0);
  assert.equal(summary.payoutPendingCount, 1);
});

test("brand scoped payout with matching creatorMissionId is included", () => {
  const summary = addScopedPayouts(
    createEmptyAnalyticsPaymentSummary(),
    [
      { amountVnd: 125000, status: "PAID", creatorMissionId: "cm_a" },
      { amountVnd: 75000, status: "PENDING", creatorMissionId: "cm_b" }
    ],
    ["campaign_a"],
    new Map([
      ["cm_a", "campaign_a"],
      ["cm_b", "campaign_b"]
    ])
  );

  assert.equal(summary.payoutRequestedVnd, 125000);
  assert.equal(summary.payoutPaidVnd, 125000);
  assert.equal(summary.payoutPendingVnd, 0);
});

test("brand scoped payout without reference stays excluded", () => {
  const summary = addScopedPayouts(
    createEmptyAnalyticsPaymentSummary(),
    [{ amountVnd: 100000, status: "PENDING" }],
    ["campaign_a"],
    new Map()
  );

  assert.equal(summary.payoutRequestedVnd, 0);
  assert.equal(summary.payoutPendingVnd, 0);
  assert.match(summary.notes.join(" "), /legacy PayoutRequest rows without campaign\/creatorMission reference/);
});
