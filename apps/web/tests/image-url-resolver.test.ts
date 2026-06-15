import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { CAMPAIGN_IMAGE_FALLBACK, resolveImageUrl } from "../lib/images/resolve-image-url.ts";

const originalNodeEnv = process.env.NODE_ENV;
const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const mutableEnv = process.env as Record<string, string | undefined>;

beforeEach(() => {
  mutableEnv["NODE_ENV"] = "production";
  mutableEnv["NEXT_PUBLIC_SUPABASE_URL"] = "https://example.supabase.co";
});

afterEach(() => {
  mutableEnv["NODE_ENV"] = originalNodeEnv;
  mutableEnv["NEXT_PUBLIC_SUPABASE_URL"] = originalSupabaseUrl;
});

test("keeps valid remote campaign images unchanged", () => {
  const url = "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1400";
  assert.equal(resolveImageUrl(url), url);
});

test("rejects a Supabase domain without an object path", () => {
  assert.equal(resolveImageUrl("https://example.supabase.co"), CAMPAIGN_IMAGE_FALLBACK);
});

test("resolves public storage paths against Supabase", () => {
  assert.equal(
    resolveImageUrl("/storage/v1/object/public/dcreator-uploads/brand-logo/example.png"),
    "https://example.supabase.co/storage/v1/object/public/dcreator-uploads/brand-logo/example.png"
  );
});

test("keeps legacy public upload paths relative", () => {
  assert.equal(resolveImageUrl("/uploads/brand-logo/example.png"), "/uploads/brand-logo/example.png");
});

test("strips localhost from legacy public upload URLs", () => {
  assert.equal(resolveImageUrl("http://localhost:3000/uploads/creator-avatar/demo.png"), "/uploads/creator-avatar/demo.png");
});

test("rejects localhost URLs outside public image paths", () => {
  assert.equal(resolveImageUrl("http://localhost:3000/api/private/avatar.png"), CAMPAIGN_IMAGE_FALLBACK);
});

test("resolves canonical object paths against the upload bucket", () => {
  assert.equal(
    resolveImageUrl("brand-logo/example.png"),
    "https://example.supabase.co/storage/v1/object/public/dcreator-uploads/brand-logo/example.png"
  );
});

test("repairs stale Supabase hostnames using the configured project URL", () => {
  assert.equal(
    resolveImageUrl("https://stale-project.supabase.co/storage/v1/object/public/dcreator-uploads/brand-logo/example.png"),
    "https://example.supabase.co/storage/v1/object/public/dcreator-uploads/brand-logo/example.png"
  );
});

test("removes stray whitespace from stored Supabase URLs", () => {
  assert.equal(
    resolveImageUrl("https://example.supabase.co\r\n/storage/v1/object/public/dcreator-uploads\r\n/brand-logo/example.png"),
    "https://example.supabase.co/storage/v1/object/public/dcreator-uploads/brand-logo/example.png"
  );
});
