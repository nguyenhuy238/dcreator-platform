import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword } from "../lib/auth/password.ts";
import { hasAtLeastRole, hasSomeRole } from "../lib/auth/roles.ts";
import {
  brandRoleRequestSchema,
  creatorRoleRequestSchema,
  loginSchema,
  registerSchema
} from "../lib/validators/auth.ts";

test("register schema validates minimal payload", () => {
  const parsed = registerSchema.parse({
    email: "user@example.com",
    password: "password123",
    displayName: "User One"
  });
  assert.equal(parsed.email, "user@example.com");
});

test("login schema rejects short password", () => {
  assert.throws(() => loginSchema.parse({ email: "user@example.com", password: "1234567" }));
});

test("creator and brand request schema validation", () => {
  creatorRoleRequestSchema.parse({ note: "I have 100K followers." });
  brandRoleRequestSchema.parse({
    brandName: "DCreator Labs",
    brandWebsite: "https://dcreator.example",
    note: "Launching influencer campaigns."
  });
});

test("password hashing and verification", () => {
  const hash = hashPassword("my-strong-password");
  assert.equal(verifyPassword("my-strong-password", hash), true);
  assert.equal(verifyPassword("wrong-password", hash), false);
});

test("role guard helpers", () => {
  assert.equal(hasAtLeastRole("BRAND_OWNER", "USER"), true);
  assert.equal(hasAtLeastRole("USER", "CREATOR"), false);
  assert.equal(hasSomeRole("ADMIN", ["ADMIN", "OPS"]), true);
});
