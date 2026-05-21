import { AppError } from "@/lib/errors";

export function assertAcceptMissionPolicy(input: { isLoggedIn: boolean; isOpen: boolean; deadlineAt?: Date | null }) {
  if (!input.isLoggedIn) throw new AppError("Unauthorized", 401, "AUTH_UNAUTHORIZED");
  if (!input.isOpen) throw new AppError("Mission not open", 409, "MISSION_NOT_OPEN");
  if (input.deadlineAt && input.deadlineAt.getTime() <= Date.now()) {
    throw new AppError("Mission expired", 409, "MISSION_EXPIRED");
  }
}

export function assertSubmitProofPolicy(input: { hasProof: boolean; deadlineAt?: Date | null }) {
  if (!input.hasProof) throw new AppError("Proof is required", 422, "PROOF_REQUIRED");
  if (input.deadlineAt && input.deadlineAt.getTime() <= Date.now()) {
    throw new AppError("Submit past deadline", 409, "MISSION_DEADLINE_PASSED");
  }
}

export function assertApprovePolicy(input: { lifecycleStatus: string; rewardGrantedAt?: Date | null }) {
  if (input.lifecycleStatus === "DONE") throw new AppError("Already approved", 409, "DOUBLE_APPROVE");
  return !input.rewardGrantedAt;
}
