import assert from "node:assert/strict";
import test from "node:test";
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

test.todo("calculate topup points by fixed rate");
test.todo("reject negative wallet balance");
test.todo("webhook signature verification");
