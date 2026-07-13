import assert from "node:assert/strict";
import test from "node:test";
import { adminDeleteEntitySchema, adminUpdateBrandSchema, adminUpdateCreatorSchema, adminUpdateUserSchema } from "../lib/validators/admin-crud.ts";

test("admin user update validates editable fields", () => {
  const parsed = adminUpdateUserSchema.parse({
    displayName: "Nguyen Admin",
    email: "admin@example.com",
    phone: "0909000000",
    role: "ADMIN",
    isActive: true,
    reason: "Cập nhật thông tin"
  });
  assert.equal(parsed.email, "admin@example.com");
  assert.equal(parsed.role, "ADMIN");
});

test("admin user update rejects invalid email and role", () => {
  assert.throws(() => adminUpdateUserSchema.parse({ email: "invalid-email" }));
  assert.throws(() => adminUpdateUserSchema.parse({ role: "SUPER_ADMIN" }));
});

test("admin creator update allows profile fields and rejects derived metrics", () => {
  const parsed = adminUpdateCreatorSchema.parse({
    displayName: "Creator One",
    contentCategory: "Beauty",
    expectedRate: 500000,
    maxJobsPerMonth: 4,
    totalEarnings: 999999999
  });
  assert.equal(parsed.displayName, "Creator One");
  assert.equal("totalEarnings" in parsed, false);
});

test("admin brand update validates contact email and omits financial balances", () => {
  const parsed = adminUpdateBrandSchema.parse({
    name: "Brand One",
    contactName: "Brand Ops",
    contactPhone: "0909000001",
    contactEmail: "brand@example.com",
    creditBalance: 1000000
  });
  assert.equal(parsed.contactEmail, "brand@example.com");
  assert.equal("creditBalance" in parsed, false);
  assert.throws(() => adminUpdateBrandSchema.parse({ contactEmail: "bad-email" }));
});

test("delete entity schema requires confirmation and reason", () => {
  const parsed = adminDeleteEntitySchema.parse({
    confirmation: "user@example.com",
    reason: "Theo yêu cầu xóa dữ liệu",
    mode: "DELETE_WITH_ACCOUNT"
  });
  assert.equal(parsed.mode, "DELETE_WITH_ACCOUNT");
  assert.throws(() => adminDeleteEntitySchema.parse({ confirmation: "user@example.com", reason: "no" }));
});
