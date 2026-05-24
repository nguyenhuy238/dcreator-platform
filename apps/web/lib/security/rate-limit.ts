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
  login: { windowMs: 10 * 60 * 1000, max: 5, message: "Đăng nhập quá nhiều lần. Vui lòng thử lại sau." },
  contribution: { windowMs: 10 * 60 * 1000, max: 20, message: "Quá nhiều yêu cầu đóng góp. Vui lòng thử lại sau." },
  proof_submit: { windowMs: 10 * 60 * 1000, max: 15, message: "Quá nhiều lần gửi bằng chứng. Vui lòng thử lại sau." },
  payment_create: { windowMs: 10 * 60 * 1000, max: 10, message: "Quá nhiều yêu cầu thanh toán. Vui lòng thử lại sau." }
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

