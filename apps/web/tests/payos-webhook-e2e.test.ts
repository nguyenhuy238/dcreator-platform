import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

function sign(rawBody: string, secret: string) {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

async function postWebhook(baseUrl: string, secret: string, payload: Record<string, unknown>) {
  const rawBody = JSON.stringify(payload);
  const signature = sign(rawBody, secret);
  return fetch(`${baseUrl}/api/campaigns/contributions/payos/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-payos-signature": signature
    },
    body: rawBody
  });
}

test("payos webhook e2e success (real env)", async (t) => {
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
  const response = await postWebhook(baseUrl, secret, payload);

  assert.equal(response.status >= 200 && response.status < 300, true);
});

test("payos webhook e2e failed status (real env)", async (t) => {
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
    transactionId: `E2E-FAIL-${Date.now()}`,
    status: "FAILED" as const,
    paidAmountVnd,
    idempotencyKey
  };
  const response = await postWebhook(baseUrl, secret, payload);
  assert.equal(response.status >= 200 && response.status < 300, true);
});

test("payos webhook e2e retry idempotency (real env)", async (t) => {
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
    transactionId: `E2E-RETRY-${Date.now()}`,
    status: "SUCCESS" as const,
    paidAmountVnd,
    idempotencyKey
  };

  const first = await postWebhook(baseUrl, secret, payload);
  const second = await postWebhook(baseUrl, secret, payload);
  assert.equal(first.status >= 200 && first.status < 300, true);
  assert.equal(second.status >= 200 && second.status < 300, true);
});
