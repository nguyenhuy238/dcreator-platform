import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { clearSessionCookie, revokeSession } from "@/lib/auth/session";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session-token";
import { toErrorResponse } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (token) {
      try {
        const payload = decodeSession(token);
        await revokeSession(payload.sid);
      } catch {
        // Ignore invalid session token on logout and clear cookie anyway.
      }
    }

    await clearSessionCookie();
    return ok({ loggedOut: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
