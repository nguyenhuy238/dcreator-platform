import { AppError } from "@/lib/errors";

type Bucket = "login" | "contribution" | "proof_submit" | "payment_create";

type Rule = {
  windowMs: number;
  max: number;
  message: string;
};

type Entry = {
  count: number;
  resetAt: number;
};

const rules: Record<Bucket, Rule> = {
  login: { windowMs: 10 * 60 * 1000, max: 5, message: "Too many login attempts. Please try again later." },
  contribution: { windowMs: 10 * 60 * 1000, max: 20, message: "Too many contribution requests. Please try again later." },
  proof_submit: { windowMs: 10 * 60 * 1000, max: 15, message: "Too many proof submissions. Please try again later." },
  payment_create: { windowMs: 10 * 60 * 1000, max: 10, message: "Too many payment requests. Please try again later." }
};

const store = new Map<string, Entry>();

export function assertRateLimit(bucket: Bucket, key: string) {
  const rule = rules[bucket];
  const now = Date.now();
  const storeKey = `${bucket}:${key}`;
  const current = store.get(storeKey);

  if (!current || current.resetAt <= now) {
    store.set(storeKey, { count: 1, resetAt: now + rule.windowMs });
    return;
  }

  if (current.count >= rule.max) {
    throw new AppError(rule.message, 429, "RATE_LIMITED");
  }

  current.count += 1;
  store.set(storeKey, current);
}

