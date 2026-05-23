import { AppError } from "@/lib/errors";

export function assertStateTransition<S extends string, A extends string>(
  current: S,
  action: A,
  allowed: Record<A, readonly S[]>,
  options?: { message?: string; code?: string }
) {
  const allowedFrom = allowed[action] ?? [];
  if (!allowedFrom.includes(current)) {
    throw new AppError(
      options?.message ?? `Invalid status transition from ${current} via ${action}`,
      409,
      options?.code ?? "INVALID_STATUS_TRANSITION"
    );
  }
}

