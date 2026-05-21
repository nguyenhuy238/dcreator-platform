import { AppError } from "@/lib/errors";

type RateLimitEntry = {
  attempts: number;
  resetAt: number;
};

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const rateLimitStore = new Map<string, RateLimitEntry>();

export function assertLoginRateLimit(key: string) {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { attempts: 1, resetAt: now + WINDOW_MS });
    return;
  }

  if (current.attempts >= MAX_ATTEMPTS) {
    throw new AppError("Too many login attempts. Please try again later.", 429, "RATE_LIMITED");
  }

  current.attempts += 1;
  rateLimitStore.set(key, current);
}
