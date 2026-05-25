import { AppError } from "@/lib/errors";

export function assertStateTransition<S extends string, A extends string>(
  current: S,
  action: A,
  allowed: Partial<Record<S | A, readonly (S | A)[]>>,
  options?: { message?: string; code?: string }
) {
  const allowedFrom = allowed[action] ?? [];
  const allowedTo = allowed[current] ?? [];
  if (!allowedFrom.includes(current) && !allowedTo.includes(action)) {
    throw new AppError(
      options?.message ?? `Invalid status transition from ${current} via ${action}`,
      409,
      options?.code ?? "INVALID_STATUS_TRANSITION"
    );
  }
}

