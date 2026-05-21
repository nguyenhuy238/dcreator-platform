import { createHmac, timingSafeEqual } from "node:crypto";
import type { Role } from "@prisma/client";
import { AppError } from "@/lib/errors";

export type SessionPayload = {
  sid: string;
  sub: string;
  role: Role;
  exp: number;
};

export const SESSION_COOKIE = "dcreator_session";

function getSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new AppError("AUTH_SESSION_SECRET is missing or too short", 500, "AUTH_CONFIG_INVALID");
  }
  return secret;
}

function b64UrlEncode(input: string) {
  return Buffer.from(input).toString("base64url");
}

function b64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(data: string) {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function encodeSession(payload: SessionPayload) {
  const header = b64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64UrlEncode(JSON.stringify(payload));
  const signature = sign(`${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

export function decodeSession(token: string) {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) {
    throw new AppError("Invalid session token format", 401, "AUTH_INVALID_SESSION");
  }

  const expectedSignature = sign(`${header}.${body}`);
  let isValidSignature = false;
  try {
    isValidSignature = timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch {
    isValidSignature = false;
  }

  if (!isValidSignature) {
    throw new AppError("Invalid session token signature", 401, "AUTH_INVALID_SESSION");
  }

  const payload = JSON.parse(b64UrlDecode(body)) as SessionPayload;
  if (payload.exp * 1000 <= Date.now()) {
    throw new AppError("Session token expired", 401, "AUTH_SESSION_EXPIRED");
  }

  return payload;
}
