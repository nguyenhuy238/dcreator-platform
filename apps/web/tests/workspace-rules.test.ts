import assert from "node:assert/strict";
import test from "node:test";
import { deriveCapabilities } from "../lib/auth/capabilities.ts";
import { resolveCurrentBrandIdFromMemberships } from "../lib/auth/brand-context-core.ts";
import { canAccessPath, getWorkspaceCards, resolveWorkspaceLanding } from "../lib/auth/workspace-choice.ts";
import { creatorChannelsUpdateSchema } from "../lib/validators/creator-dashboard.ts";

test("case 1: normal user keeps Companion capability and upgrade CTAs are eligible", () => {
  const capabilities = deriveCapabilities({ roles: ["USER"], creatorProfile: null, brandMemberships: [] });
  assert.deepEqual(capabilities, { user: true, creator: false, brand: false, admin: false });

  const cards = getWorkspaceCards({ roles: ["USER"], creatorProfile: null, brandMemberships: [] });
  assert.deepEqual(cards.map((item) => item.id), ["user"]);
  assert.equal(canAccessPath("/dashboard/user", { roles: ["USER"], creatorProfile: null, brandMemberships: [] }), true);
  assert.equal(canAccessPath("/dashboard/creator", { roles: ["USER"], creatorProfile: null, brandMemberships: [] }), false);
});

test("case 2: creator capability comes from CreatorProfile and channel schema accepts multiple social channels", () => {
  const capabilities = deriveCapabilities({ roles: ["USER"], creatorProfile: { id: "creator_1" }, brandMemberships: [] });
  assert.equal(capabilities.creator, true);

  const tiktok = creatorChannelsUpdateSchema.parse({
    platform: "TikTok",
    handle: "demo",
    url: "https://www.tiktok.com/@demo",
    followerCount: 1000
  });
  const instagram = creatorChannelsUpdateSchema.parse({
    platform: "Instagram",
    handle: "demo.ig",
    url: "https://www.instagram.com/demo.ig",
    followerCount: 800
  });

  assert.equal(tiktok.platform, "TikTok");
  assert.equal(instagram.platform, "Instagram");
  assert.throws(() =>
    creatorChannelsUpdateSchema.parse({
      platform: "TIKTOK",
      handle: "bad",
      url: "https://www.tiktok.com/@bad",
      followerCount: 1
    })
  );
});

test("case 3, 5, 7: currentBrandId must be selected from active brand memberships", () => {
  const user = {
    brandMemberships: [
      { id: "brand_a" },
      { id: "brand_b" }
    ],
    activeBrandId: "brand_a"
  };

  assert.equal(resolveCurrentBrandIdFromMemberships({ ...user, preferredBrandId: null }), "brand_a");
  assert.equal(resolveCurrentBrandIdFromMemberships({ ...user, preferredBrandId: "brand_b" }), "brand_b");
  assert.throws(() => resolveCurrentBrandIdFromMemberships({ ...user, preferredBrandId: "brand_x" }), /không có quyền/);
});

test("case 4: creator plus brand owner sees both workspaces and gets chooser", () => {
  const user = {
    roles: ["USER" as const, "CREATOR" as const, "BRAND_OWNER" as const],
    creatorProfile: { id: "creator_1" },
    brandMemberships: [{ id: "brand_1", name: "Brand 1", role: "OWNER" as const }]
  };

  const landing = resolveWorkspaceLanding(user);
  assert.equal(landing.type, "choose");
  assert.deepEqual(getWorkspaceCards(user).map((item) => item.id), ["user", "creator", "brand"]);
  assert.equal(canAccessPath("/dashboard/creator", user), true);
  assert.equal(canAccessPath("/dashboard/brand", user), true);
});

test("case 6: brand staff gets only memberships they belong to and can access brand workspace", () => {
  const staff = {
    roles: ["USER" as const],
    creatorProfile: null,
    brandMemberships: [{ id: "brand_staff", name: "Staff Brand", role: "STAFF" as const }]
  };

  assert.equal(deriveCapabilities({ roles: staff.roles, brandMemberships: staff.brandMemberships }).brand, true);
  assert.equal(canAccessPath("/dashboard/brand", staff), true);
  assert.deepEqual(getWorkspaceCards(staff).map((item) => item.id), ["user", "brand"]);
});

test("case 8: admin capability is additive and does not remove brand workspace", () => {
  const adminBrand = {
    roles: ["USER" as const, "ADMIN" as const],
    creatorProfile: null,
    brandMemberships: [{ id: "brand_admin", name: "Admin Brand", role: "OWNER" as const }]
  };

  assert.deepEqual(getWorkspaceCards(adminBrand).map((item) => item.id), ["user", "brand", "admin"]);
  assert.equal(canAccessPath("/admin", adminBrand), true);
  assert.equal(canAccessPath("/dashboard/brand", adminBrand), true);
});
