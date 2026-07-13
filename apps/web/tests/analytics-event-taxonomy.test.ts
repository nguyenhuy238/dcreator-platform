import { strict as assert } from "node:assert";
import { test } from "node:test";
import { AnalyticsEventName } from "@prisma/client";
import { DCREATOR_ANALYTICS_EVENTS } from "../lib/analytics-events.ts";
import {
  buildDcreatorEventMetadata,
  resolveAnalyticsEventNameForDb,
  sanitizeAnalyticsMetadata
} from "../lib/analytics-event-taxonomy.ts";

test("dCreator analytics event taxonomy has no duplicate values", () => {
  const values = Object.values(DCREATOR_ANALYTICS_EVENTS);
  assert.equal(new Set(values).size, values.length);
});

test("analytics metadata sanitizer removes sensitive keys and trims strings", () => {
  const sanitized = sanitizeAnalyticsMetadata({
    token: "secret-token",
    password: "secret-password",
    rawPayload: { checksum: "abc" },
    bankAccountNumber: "123456789",
    publicStatus: "x".repeat(400),
    nested: { signature: "hidden", safe: "ok" }
  });

  assert.equal(sanitized?.token, undefined);
  assert.equal(sanitized?.password, undefined);
  assert.equal(sanitized?.rawPayload, undefined);
  assert.equal(sanitized?.bankAccountNumber, undefined);
  assert.equal(sanitized?.publicStatus, "x".repeat(300));
  assert.deepEqual(sanitized?.nested, { safe: "ok" });
});

test("canonical dCreator event resolves to legacy DB event when enum migration is not available", () => {
  assert.equal(
    resolveAnalyticsEventNameForDb(DCREATOR_ANALYTICS_EVENTS.CREATOR_PROOF_SUBMITTED),
    AnalyticsEventName.mission_submit
  );
  assert.equal(
    resolveAnalyticsEventNameForDb(DCREATOR_ANALYTICS_EVENTS.PAYMENT_SUCCEEDED),
    AnalyticsEventName.payment_success
  );
  assert.equal(resolveAnalyticsEventNameForDb(DCREATOR_ANALYTICS_EVENTS.ANALYTICS_CSV_EXPORTED), null);
});

test("canonical event name is retained inside sanitized metadata", () => {
  const metadata = buildDcreatorEventMetadata({
    eventName: DCREATOR_ANALYTICS_EVENTS.CREATOR_APPLICATION_SUBMITTED,
    accountId: "acct_1",
    campaignId: "camp_1",
    metadata: { source: "test", secret: "hidden" }
  });

  assert.equal(metadata?.dcreatorEventName, DCREATOR_ANALYTICS_EVENTS.CREATOR_APPLICATION_SUBMITTED);
  assert.equal(metadata?.accountId, "acct_1");
  assert.equal(metadata?.source, "test");
  assert.equal(metadata?.secret, undefined);
});
