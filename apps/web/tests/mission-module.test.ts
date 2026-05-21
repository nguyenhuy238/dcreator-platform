import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../lib/errors.ts";
import { assertAcceptMissionPolicy, assertApprovePolicy, assertSubmitProofPolicy } from "../lib/services/mission-policy.ts";

test("Accept mission when not logged in", () => {
  assert.throws(
    () => assertAcceptMissionPolicy({ isLoggedIn: false, isOpen: true }),
    (error: unknown) => error instanceof AppError && error.code === "AUTH_UNAUTHORIZED"
  );
});

test("Accept mission when expired", () => {
  assert.throws(
    () => assertAcceptMissionPolicy({ isLoggedIn: true, isOpen: true, deadlineAt: new Date(Date.now() - 1_000) }),
    (error: unknown) => error instanceof AppError && error.code === "MISSION_EXPIRED"
  );
});

test("Submit proof missing URL/file", () => {
  assert.throws(
    () => assertSubmitProofPolicy({ hasProof: false }),
    (error: unknown) => error instanceof AppError && error.code === "PROOF_REQUIRED"
  );
});

test("Submit proof after deadline", () => {
  assert.throws(
    () => assertSubmitProofPolicy({ hasProof: true, deadlineAt: new Date(Date.now() - 1_000) }),
    (error: unknown) => error instanceof AppError && error.code === "MISSION_DEADLINE_PASSED"
  );
});

test("Approve proof", () => {
  const canGrant = assertApprovePolicy({ lifecycleStatus: "PENDING_REVIEW" });
  assert.equal(canGrant, true);
});

test("Reject proof should be represented by non-approve status", () => {
  const canGrant = assertApprovePolicy({ lifecycleStatus: "REJECTED" });
  assert.equal(canGrant, true);
});

test("Double approve", () => {
  assert.throws(
    () => assertApprovePolicy({ lifecycleStatus: "DONE" }),
    (error: unknown) => error instanceof AppError && error.code === "DOUBLE_APPROVE"
  );
});

test("Reward points grant only once", () => {
  const canGrant = assertApprovePolicy({ lifecycleStatus: "PENDING_REVIEW", rewardGrantedAt: new Date() });
  assert.equal(canGrant, false);
});
