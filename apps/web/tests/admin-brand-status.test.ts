import assert from "node:assert/strict";
import test from "node:test";
import { BrandStatus } from "@prisma/client";
import { activeBrandWhere } from "../lib/services/admin-brand-status.ts";

test("admin active brand excludes locked brands", () => {
  assert.deepEqual(activeBrandWhere, {
    isLocked: false,
    status: BrandStatus.ACTIVE
  });
});
