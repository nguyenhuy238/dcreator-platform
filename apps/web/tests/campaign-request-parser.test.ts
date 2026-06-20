import assert from "node:assert/strict";
import test from "node:test";
import { parseCampaignRequestContent } from "../app/admin/campaigns/_lib/parseCampaignRequestContent.ts";

test("extracts Supabase campaign content file markers", () => {
  const contentUrl = "https://example.supabase.co/storage/v1/object/public/dcreator-uploads/onboarding-doc/campaign-template.docx";
  const parsed = parseCampaignRequestContent(`Yeu cau tao campaign\n[[CONTENT_FILE_URL]]:${contentUrl}`);

  assert.equal(parsed.contentFileUrl, contentUrl);
  assert.equal(parsed.links.length, 1);
  assert.equal(parsed.links[0]?.type, "file");
});

test("extracts local upload campaign content file markers", () => {
  const contentUrl = "/uploads/onboarding-doc/campaign-template.docx";
  const parsed = parseCampaignRequestContent(`Yeu cau tao campaign\n[[CONTENT_FILE_URL]]:${contentUrl}`);

  assert.equal(parsed.contentFileUrl, contentUrl);
  assert.equal(parsed.links.length, 1);
  assert.equal(parsed.links[0]?.type, "file");
});
