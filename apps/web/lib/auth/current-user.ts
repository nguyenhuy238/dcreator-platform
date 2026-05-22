import type { Role } from "@prisma/client";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getCurrentSessionFromRequest } from "@/lib/auth/session";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session-token";
import { resolvePrimaryRole } from "@/lib/auth/role-constants";

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  primaryRole: Role;
  roles: Role[];
  isActive: boolean;
  creatorProfile: { id: string } | null;
  brands: Array<{ id: string; name: string; role: "OWNER" | "STAFF" }>;
};

export async function getCurrentUser(request: NextRequest): Promise<CurrentUser | null> {
  const session = await getCurrentSessionFromRequest(request);
  if (!session) return null;

  const account = await prisma.account.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      isActive: true,
      roleAssignments: { select: { role: true } },
      creatorProfile: { select: { id: true } },
      ownedBrandMemberships: {
        include: { brand: { select: { id: true, name: true } } }
      }
    }
  });
  if (!account || !account.isActive) return null;

  const assignmentRoles = account.roleAssignments.map((item) => item.role);
  const roles = Array.from(new Set<Role>(assignmentRoles.length > 0 ? assignmentRoles : [session.role]));
  const primaryRole = resolvePrimaryRole(roles);
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
    role: primaryRole,
    primaryRole,
    roles,
    isActive: account.isActive,
    creatorProfile: account.creatorProfile,
    brands: account.ownedBrandMemberships.map((item) => ({ id: item.brand.id, name: item.brand.name, role: item.role }))
  };
}

export async function getCurrentUserFromServer() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = decodeSession(token);
    const mockRequest = { cookies: { get: (name: string) => (name === SESSION_COOKIE ? { value: token } : undefined) } } as unknown as NextRequest;
    const session = await getCurrentSessionFromRequest(mockRequest);
    if (!session || session.sub !== payload.sub) return null;
    const account = await prisma.account.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        isActive: true,
        roleAssignments: { select: { role: true } },
        creatorProfile: { select: { id: true } },
        ownedBrandMemberships: { include: { brand: { select: { id: true, name: true } } } }
      }
    });
    if (!account || !account.isActive) return null;
    const assignmentRoles = account.roleAssignments.map((item) => item.role);
    const roles = Array.from(new Set<Role>(assignmentRoles.length > 0 ? assignmentRoles : [payload.role]));
    const primaryRole = resolvePrimaryRole(roles);
    return {
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      avatarUrl: account.avatarUrl,
      role: primaryRole,
      primaryRole,
      roles,
      isActive: account.isActive,
      creatorProfile: account.creatorProfile,
      brands: account.ownedBrandMemberships.map((item) => ({ id: item.brand.id, name: item.brand.name, role: item.role }))
    } satisfies CurrentUser;
  } catch {
    return null;
  }
}

export async function requireCurrentUser(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) throw new AppError("Unauthorized", 401, "AUTH_UNAUTHORIZED");
  return user;
}
