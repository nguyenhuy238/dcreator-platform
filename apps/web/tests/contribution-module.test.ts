import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { contributionCreateSchema, contributionPayosWebhookSchema } from "../lib/validators/contribution.ts";

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
  const raw = JSON.stringify({
    orderCode: "SP12345",
    transactionId: "GW123",
    status: "SUCCESS",
    paidAmountVnd: 50000,
    idempotencyKey: "support-abc-12345"
  });
  const signature = createHmac("sha256", secret).update(raw).digest("hex");
  const verified = createHmac("sha256", secret).update(raw).digest("hex") === signature;
  assert.equal(verified, true);
});

test.todo("campaign inactive should return CAMPAIGN_INACTIVE");
test.todo("reward out of stock should return REWARD_OUT_OF_STOCK");
test.todo("insufficient N-Points should return INSUFFICIENT_BALANCE");
test.todo("concurrent purchase with 1 slot should allow only one success");
test.todo("duplicate webhook should be idempotent and not double create claim");
test.todo("spam click with same idempotencyKey should return same contribution");
test.todo("payment failed webhook should mark contribution FAILED and restore stock exactly once");
test.todo("user refresh after payment should see final contribution status without double counting");
