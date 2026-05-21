import assert from "node:assert/strict";
import test from "node:test";
import { assertRateLimit } from "../lib/security/rate-limit.ts";
import { AUDIT_ACTIONS } from "../lib/services/audit-log.service.ts";

test("rate limit blocks after threshold", () => {
  const key = `test-${Date.now()}`;
  for (let i = 0; i < 5; i += 1) {
    assert.doesNotThrow(() => assertRateLimit("login", key));
  }
  assert.throws(() => assertRateLimit("login", key));
});

test("audit actions include required decision events", () => {
  assert.equal(AUDIT_ACTIONS.ADMIN_CAMPAIGN_APPROVED, "CAMPAIGN_REVIEW_APPROVED");
  assert.equal(AUDIT_ACTIONS.ADMIN_CAMPAIGN_REJECTED, "CAMPAIGN_REVIEW_REJECTED");
  assert.equal(AUDIT_ACTIONS.VOUCHER_REDEEMED, "VOUCHER_REDEEMED");
  assert.equal(AUDIT_ACTIONS.USER_LOCKED, "USER_LOCKED");
});

