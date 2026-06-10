import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCreatorLinks, resolveSelectedIndustries } from "../lib/profile-upgrade-form.ts";
import { brandApplicationSchema, creatorApplicationSchema } from "../lib/validators/role-upgrade.ts";
import { uploadPathOrHttpUrlSchema } from "../lib/validators/brand-dashboard.ts";

test("creator upgrade rejects empty links", () => {
  assert.throws(
    () => normalizeCreatorLinks([{ platform: "tiktok", url: "", handle: "", followerCount: 0 }]),
    /Vui lòng thêm ít nhất 1 liên kết/
  );
});

test("creator upgrade accepts one TikTok link and adds https protocol", () => {
  assert.deepEqual(normalizeCreatorLinks([{ platform: "tiktok", url: "tiktok.com/@demo", handle: "@demo", followerCount: 12000 }]), [
    { platform: "tiktok", url: "https://tiktok.com/@demo", handle: "demo", followerCount: 12000 }
  ]);
});

test("creator upgrade accepts multiple links including duplicate platforms", () => {
  assert.equal(normalizeCreatorLinks([
    { platform: "facebook", url: "https://facebook.com/demo-one", handle: "demo-one", followerCount: 2000 },
    { platform: "facebook", url: "https://facebook.com/demo-two", handle: "demo-two", followerCount: 3000 },
    { platform: "instagram", url: "instagram.com/demo", handle: "demo", followerCount: 4000 },
    { platform: "shopee", url: "shopee.vn/demo", handle: "demo-shop", followerCount: 5000 }
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

test("brand logo accepts local uploads and deployed storage URLs", () => {
  assert.equal(uploadPathOrHttpUrlSchema.safeParse("/uploads/brand-logo/demo.png").success, true);
  assert.equal(uploadPathOrHttpUrlSchema.safeParse("https://project.supabase.co/storage/v1/object/public/uploads/brand-logo/demo.png").success, true);
  assert.equal(uploadPathOrHttpUrlSchema.safeParse("ftp://example.com/demo.png").success, false);
});

test("brand application logo accepts uploaded local and deployed URLs", () => {
  const basePayload = {
    brandName: "Demo Brand",
    contactName: "Nguyen Van A",
    contactPhone: "0912345678",
    contactEmail: "brand@example.com"
  };

  assert.equal(brandApplicationSchema.safeParse({ ...basePayload, logoUrl: "/uploads/brand-logo/demo.png" }).success, true);
  assert.equal(
    brandApplicationSchema.safeParse({
      ...basePayload,
      logoUrl: "https://project.supabase.co/storage/v1/object/public/uploads/brand-logo/demo.png"
    }).success,
    true
  );
  assert.equal(brandApplicationSchema.safeParse({ ...basePayload, logoUrl: "ftp://example.com/demo.png" }).success, false);
});

test("creator application avatar accepts uploaded local and deployed URLs", () => {
  const basePayload = {
    displayName: "Demo Creator",
    mainPlatform: "TIKTOK",
    socialUrl: "https://www.tiktok.com/@demo"
  };

  assert.equal(creatorApplicationSchema.safeParse({ ...basePayload, avatarUrl: "/uploads/creator-avatar/demo.png" }).success, true);
  assert.equal(
    creatorApplicationSchema.safeParse({
      ...basePayload,
      avatarUrl: "https://project.supabase.co/storage/v1/object/public/uploads/creator-avatar/demo.png"
    }).success,
    true
  );
  assert.equal(creatorApplicationSchema.safeParse({ ...basePayload, avatarUrl: "ftp://example.com/demo.png" }).success, false);
});
