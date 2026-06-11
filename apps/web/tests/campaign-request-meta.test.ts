import assert from "node:assert/strict";
import test from "node:test";
import { extractCampaignRequestMarkerValue, extractCampaignRequestMeta, campaignRequestMarkers } from "../lib/campaign-request-meta.ts";

test("reconstructs a split Supabase content file url from campaign request brief", () => {
  const brief = [
    "Yeu cau tao campaign tu Brand: Demo",
    `${campaignRequestMarkers.content}https://example.supabase.co`,
    "/storage/v1/object/public/dcreator-uploads/onboarding-doc/demo.docx"
  ].join("\n");

  assert.equal(
    extractCampaignRequestMarkerValue(brief, campaignRequestMarkers.content),
    "https://example.supabase.co/storage/v1/object/public/dcreator-uploads/onboarding-doc/demo.docx"
  );
});

test("extractCampaignRequestMeta keeps clean brief and decodes requirements", () => {
  const brief = [
    "Noi dung mo ta",
    `${campaignRequestMarkers.cover}https://example.supabase.co`,
    "/storage/v1/object/public/dcreator-uploads/brand-logo/demo.png",
    `${campaignRequestMarkers.requirements}${encodeURIComponent("Can bo sung hashtag")}`
  ].join("\n");

  const meta = extractCampaignRequestMeta(brief);

  assert.equal(
    meta.coverImageUrl,
    "https://example.supabase.co/storage/v1/object/public/dcreator-uploads/brand-logo/demo.png"
  );
  assert.equal(meta.requirements, "Can bo sung hashtag");
  assert.equal(meta.cleanBrief, "Noi dung mo ta");
});
