import assert from "node:assert/strict";
import test from "node:test";
import {
  BRAND_SUBSCRIPTION_PACKAGE_VIDEO_QUOTA,
  BRAND_SUBSCRIPTION_PACKAGES
} from "../lib/constants/brand-subscription.ts";

test("brand UGC packages expose updated names, pricing, quotas, and livestream benefits", () => {
  const package20 = BRAND_SUBSCRIPTION_PACKAGES.find((item) => item.code === "UGC_20_VIDEO");
  const package60 = BRAND_SUBSCRIPTION_PACKAGES.find((item) => item.code === "UGC_60_VIDEO");

  assert.ok(package20);
  assert.equal(package20.name, "UGC - Gói 20 Video");
  assert.equal(package20.pricePoints, 5_000_000);
  assert.equal(package20.summary, "20 video review sản phẩm/dịch vụ với creator trên hệ thống.");
  assert.equal(BRAND_SUBSCRIPTION_PACKAGE_VIDEO_QUOTA.UGC_20_VIDEO, 20);
  assert.equal(package20.features.some((feature) => feature.toLowerCase().includes("livestream")), false);

  assert.ok(package60);
  assert.equal(package60.name, "UGC - Gói 60 Video");
  assert.equal(package60.pricePoints, 10_000_000);
  assert.equal(package60.summary, "Gói mở rộng cho chiến dịch phủ rộng nội dung UGC với 60 video review sản phẩm/dịch vụ.");
  assert.equal(BRAND_SUBSCRIPTION_PACKAGE_VIDEO_QUOTA.UGC_60_VIDEO, 60);
  assert.ok(package60.features.includes("4 giờ livestream bán hàng trên kênh của Brand"));
});
