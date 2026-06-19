import assert from "node:assert/strict";
import test from "node:test";
import {
  getCampaignParticipationSteps,
  normalizeCampaignFulfillmentMode
} from "../lib/constants/campaign-fulfillment.ts";

test("campaign cũ mặc định dùng BRAND_SHIP", () => {
  assert.equal(normalizeCampaignFulfillmentMode(undefined), "BRAND_SHIP");
  assert.equal(getCampaignParticipationSteps(undefined)[2]?.title, "NHẬN SẢN PHẨM");
});

test("BRAND_SHIP hiển thị bước nhận sản phẩm và bước thu nhập mới", () => {
  const steps = getCampaignParticipationSteps("BRAND_SHIP");

  assert.equal(steps.length, 5);
  assert.equal(steps[2]?.title, "NHẬN SẢN PHẨM");
  assert.equal(steps[4]?.title, "ĐÁNH GIÁ SẢN PHẨM & NHẬN THU NHẬP");
});

test("CREATOR_ORDER hiển thị bước đặt sản phẩm", () => {
  const steps = getCampaignParticipationSteps("CREATOR_ORDER");

  assert.equal(steps.length, 5);
  assert.equal(steps[2]?.title, "ĐẶT SẢN PHẨM");
  assert.equal(steps[4]?.title, "ĐÁNH GIÁ SẢN PHẨM & NHẬN THU NHẬP");
});
