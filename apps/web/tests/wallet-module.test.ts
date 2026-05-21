import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { AppError } from "../lib/errors.ts";
import {
  assertNonNegativeBalance,
  calculateTopupPoints,
  verifyWebhookSignature
} from "../lib/services/wallet.service.ts";
import {
  payoutRequestSchema,
  topupConfirmSchema,
  topupCreatePaymentSchema
} from "../lib/validators/wallet.ts";

test("topup create payment schema requires idempotency key", () => {
  assert.throws(() => topupCreatePaymentSchema.parse({ amountVnd: 100000, idempotencyKey: "123" }));
  const parsed = topupCreatePaymentSchema.parse({ amountVnd: 100000, idempotencyKey: "topup-abc-123" });
  assert.equal(parsed.amountVnd, 100000);
});

test("topup confirm schema validates webhook payload", () => {
  const parsed = topupConfirmSchema.parse({
    provider: "PAYOS",
    orderCode: "TP12345",
    transactionId: "GW12345",
    status: "SUCCESS",
    paidAmountVnd: 250000,
    idempotencyKey: "topup-idempotent-1",
    paidAt: new Date().toISOString()
  });
  assert.equal(parsed.status, "SUCCESS");
});

test("payout request schema validates payload", () => {
  const parsed = payoutRequestSchema.parse({
    amountVnd: 50000,
    note: "Creator payout",
    idempotencyKey: "payout-1-abc"
  });
  assert.equal(parsed.amountVnd, 50000);
});

test("calculate topup points by fixed rate", () => {
  assert.equal(calculateTopupPoints(100000), 1000);
  assert.equal(calculateTopupPoints(999), 9);
});

test("reject negative wallet balance", () => {
  assert.throws(() => assertNonNegativeBalance(-1, 0), AppError);
  assert.throws(() => assertNonNegativeBalance(0, -1), AppError);
  assert.doesNotThrow(() => assertNonNegativeBalance(0, 0));
});

test("webhook signature verification", () => {
  const rawBody = JSON.stringify({ hello: "world" });
  const secret = "wallet-secret";
  const signature = createHmac("sha256", secret).update(rawBody).digest("hex");
  assert.equal(verifyWebhookSignature(rawBody, signature, secret), true);
  assert.equal(verifyWebhookSignature(rawBody, "wrong-signature", secret), false);
});
