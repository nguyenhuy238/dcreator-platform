import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { contributionCreateSchema, contributionPayosWebhookSchema } from "../lib/validators/contribution.ts";
import { verifyContributionWebhookSignature } from "../lib/services/contribution.service.ts";

test("create contribution schema validates required fields", () => {
  const parsed = contributionCreateSchema.parse({
    rewardId: "cm12345678901234567890123",
    paymentMethod: "N_POINTS",
    amount: 50000,
    idempotencyKey: "support-abc-12345"
  });
  assert.equal(parsed.paymentMethod, "N_POINTS");
});

test("webhook schema validates payload", () => {
  const parsed = contributionPayosWebhookSchema.parse({
    orderCode: "SP12345",
    transactionId: "GW123",
    status: "SUCCESS",
    paidAmountVnd: 50000,
    idempotencyKey: "support-abc-12345"
  });
  assert.equal(parsed.status, "SUCCESS");
});

test("webhook signature verification", () => {
  const secret = "test-secret";
  process.env.PAYOS_WEBHOOK_SECRET = secret;
  const raw = JSON.stringify({
    orderCode: "SP12345",
    transactionId: "GW123",
    status: "SUCCESS",
    paidAmountVnd: 50000,
    idempotencyKey: "support-abc-12345"
  });
  const signature = createHmac("sha256", secret).update(raw).digest("hex");
  assert.equal(verifyContributionWebhookSignature(raw, signature), true);
});

test.skip("campaign inactive should return CAMPAIGN_INACTIVE", () => {});
test.skip("reward out of stock should return REWARD_OUT_OF_STOCK", () => {});
test.skip("insufficient N-Points should return INSUFFICIENT_BALANCE", () => {});
test.skip("concurrent purchase with 1 slot should allow only one success", () => {});
test.skip("duplicate webhook should be idempotent and not double create claim", () => {});
test.skip("spam click with same idempotencyKey should return same contribution", () => {});
test.skip("payment failed webhook should mark contribution FAILED and restore stock", () => {});
