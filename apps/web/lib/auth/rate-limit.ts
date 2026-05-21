import { assertRateLimit } from "@/lib/security/rate-limit";

export function assertLoginRateLimit(key: string) {
  assertRateLimit("login", key);
}
