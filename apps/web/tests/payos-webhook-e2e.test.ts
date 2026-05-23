import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

test("payos webhook e2e smoke test (real env)", async (t) => {
  const baseUrl = process.env.E2E_BASE_URL;
  const secret = process.env.PAYOS_WEBHOOK_SECRET;
  const orderCode = process.env.E2E_PAYOS_ORDER_CODE;
  const idempotencyKey = process.env.E2E_PAYOS_IDEMPOTENCY_KEY;
  const paidAmountRaw = process.env.E2E_PAYOS_PAID_AMOUNT_VND;

  if (!baseUrl || !secret || !orderCode || !idempotencyKey || !paidAmountRaw) {
    t.skip("Missing E2E webhook env vars");
    return;
  }

  const paidAmountVnd = Number(paidAmountRaw);
  if (!Number.isFinite(paidAmountVnd) || paidAmountVnd <= 0) {
    t.skip("Invalid E2E_PAYOS_PAID_AMOUNT_VND");
    return;
  }

  const payload = {
    orderCode,
    transactionId: `E2E-${Date.now()}`,
    status: "SUCCESS" as const,
    paidAmountVnd,
    idempotencyKey
  };

  const rawBody = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(rawBody).digest("hex");

  const response = await fetch(`${baseUrl}/api/campaigns/contributions/payos/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-payos-signature": signature
    },
    body: rawBody
  });

  assert.equal(response.status >= 200 && response.status < 300, true);
});

