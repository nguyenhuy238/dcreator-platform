import assert from "node:assert/strict";
import test from "node:test";
import { voucherAdminCancelSchema, voucherAdminQuerySchema, voucherRedeemSchema } from "../lib/validators/voucher.ts";

test("voucher redeem schema validation", () => {
  const parsed = voucherRedeemSchema.parse({ redemptionNote: "Use at store A" });
  assert.equal(parsed.redemptionNote, "Use at store A");
});

test("voucher admin cancel schema validation", () => {
  const parsed = voucherAdminCancelSchema.parse({ reason: "Fraud case" });
  assert.equal(parsed.reason, "Fraud case");
});

test("voucher admin query schema validation", () => {
  const parsed = voucherAdminQuerySchema.parse({ page: "1", limit: "20", code: "VCH", user: "demo" });
  assert.equal(parsed.page, 1);
  assert.equal(parsed.limit, 20);
});

test.skip("user cannot view another user's voucher", () => {});
test.skip("cannot redeem used voucher", () => {});
test.skip("cannot redeem expired voucher", () => {});
test.skip("admin can cancel non-used voucher", () => {});
test.skip("cancelled voucher cannot redeem", () => {});
test.skip("redeem writes audit log", () => {});
