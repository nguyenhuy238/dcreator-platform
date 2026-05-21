import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/errors";

export type AuthSession = {
  sub: string;
  role: "USER" | "CREATOR" | "BRAND" | "ADMIN";
  email: string;
  exp: number;
};

const ALGO = "sha256";

function b64UrlEncode(input: string) {
  return Buffer.from(input).toString("base64url");
}

function b64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(data: string, secret: string) {
  return createHmac(ALGO, secret).update(data).digest("base64url");
}

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new AppError("JWT_SECRET is missing or too short", 500, "AUTH_CONFIG_INVALID");
  }
  return secret;
}

export function createAccessToken(payload: Omit<AuthSession, "exp">, ttlSeconds = 60 * 60 * 24 * 7) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const header = b64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64UrlEncode(JSON.stringify({ ...payload, exp } satisfies AuthSession));
  const signature = sign(`${header}.${body}`, getSecret());
  return `${header}.${body}.${signature}`;
}

export function verifyAccessToken(token: string): AuthSession {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) {
    throw new AppError("Invalid token format", 401, "AUTH_INVALID_TOKEN");
  }

  const expected = sign(`${header}.${body}`, getSecret());
  const validSig = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!validSig) {
    throw new AppError("Invalid token signature", 401, "AUTH_INVALID_TOKEN");
  }

  const session = JSON.parse(b64UrlDecode(body)) as AuthSession;
  if (session.exp * 1000 < Date.now()) {
    throw new AppError("Token expired", 401, "AUTH_TOKEN_EXPIRED");
  }

  return session;
}