import assert from "node:assert/strict";
import test from "node:test";
import { isPaymentTerminalStatus, shouldProcessPaymentWebhook } from "../lib/payments/idempotency.ts";

test("duplicate webhook should not be processed for terminal states", () => {
  assert.equal(shouldProcessPaymentWebhook("SUCCESS"), false);
  assert.equal(shouldProcessPaymentWebhook("FAILED"), false);
});

test("pending webhook should be processed exactly once", () => {
  assert.equal(shouldProcessPaymentWebhook("PENDING"), true);
  assert.equal(isPaymentTerminalStatus("SUCCESS"), true);
  assert.equal(isPaymentTerminalStatus("FAILED"), true);
  assert.equal(isPaymentTerminalStatus("PENDING"), false);
});
