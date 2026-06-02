import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCreatorLinks, resolveSelectedIndustries } from "../lib/profile-upgrade-form.ts";

test("creator upgrade rejects empty links", () => {
  assert.throws(
    () => normalizeCreatorLinks([{ platform: "tiktok", url: "" }]),
    /Vui lòng thêm ít nhất 1 liên kết/
  );
});

test("creator upgrade accepts one TikTok link and adds https protocol", () => {
  assert.deepEqual(normalizeCreatorLinks([{ platform: "tiktok", url: "tiktok.com/@demo" }]), [
    { platform: "tiktok", url: "https://tiktok.com/@demo" }
  ]);
});

test("creator upgrade accepts multiple links including duplicate platforms", () => {
  assert.equal(normalizeCreatorLinks([
    { platform: "facebook", url: "https://facebook.com/demo-one" },
    { platform: "facebook", url: "https://facebook.com/demo-two" },
    { platform: "instagram", url: "instagram.com/demo" },
    { platform: "shopee", url: "shopee.vn/demo" }
  ]).length, 4);
});

test("brand upgrade rejects empty industries", () => {
  assert.throws(() => resolveSelectedIndustries([], ""), /Vui lòng chọn ít nhất 1 ngành hàng/);
});

test("brand upgrade accepts multiple industries", () => {
  assert.deepEqual(resolveSelectedIndustries(["F&B", "Công nghệ", "Khác"], "Du lịch"), [
    "F&B",
    "Công nghệ",
    "Du lịch"
  ]);
});
