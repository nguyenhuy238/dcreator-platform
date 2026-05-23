import { randomUUID } from "node:crypto";
import type { Role } from "@prisma/client";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { decodeSession, encodeSession, SESSION_COOKIE } from "@/lib/auth/session-token";
import { RuntimeTtlCache } from "@/lib/perf/runtime-cache";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const sessionCache = new RuntimeTtlCache<{ payload: ReturnType<typeof decodeSession> }>(10_000, 5000);

export async function createSession(accountId: string, role: Role) {
  const session = await prisma.authSession.create({
    data: {
      id: randomUUID(),
      accountId,
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
    }
  });

  return encodeSession({
    sid: session.id,
    sub: accountId,
    role,
    exp: Math.floor(session.expiresAt.getTime() / 1000)
  });
}

export async function getCurrentSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const cached = sessionCache.get(token);
  if (cached) return cached.payload;

  const payload = decodeSession(token);
  const session = await prisma.authSession.findUnique({
    where: { id: payload.sid },
    select: {
      id: true,
      accountId: true,
      expiresAt: true,
      revokedAt: true
    }
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  sessionCache.set(token, { payload });
  return payload;
}

export async function revokeSession(sessionId: string) {
  await prisma.authSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}
