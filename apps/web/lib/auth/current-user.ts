import type { Role } from "@prisma/client";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getCurrentSessionFromRequest } from "@/lib/auth/session";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session-token";
import { resolvePrimaryRole } from "@/lib/auth/role-constants";
import { deriveCapabilities, type UserCapabilities } from "@/lib/auth/capabilities";
import { RuntimeTtlCache } from "@/lib/perf/runtime-cache";

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
  brandMemberships: Array<{ id: string; name: string; role: "OWNER" | "STAFF" }>;
  activeBrandId: string | null;
  capabilities: UserCapabilities;
  permissions: string[];
  creatorRequestStatus: string | null;
  brandRequestStatus: string | null;
};

const currentUserCache = new RuntimeTtlCache<CurrentUser>(15_000, 4000);

function mapAccountToCurrentUser(
  account: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    isActive: boolean;
    roleAssignments: Array<{ role: Role }>;
    creatorProfile: { id: string } | null;
    creatorApplications: Array<{ status: string }>;
    brandApplications: Array<{ status: string }>;
    ownedBrandMemberships: Array<{ role: "OWNER" | "STAFF"; brand: { id: string; name: string } }>;
  },
  fallbackRole: Role
): CurrentUser {
  const assignmentRoles = account.roleAssignments.map((item) => item.role);
  const roles = Array.from(new Set<Role>(assignmentRoles.length > 0 ? assignmentRoles : [fallbackRole]));
  const primaryRole = resolvePrimaryRole(roles);
  const brandMemberships = account.ownedBrandMemberships.map((item) => ({ id: item.brand.id, name: item.brand.name, role: item.role }));
  const capabilities = deriveCapabilities({
    roles,
    creatorProfile: account.creatorProfile,
    brandMemberships
  });

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
    brandMemberships,
    activeBrandId: brandMemberships[0]?.id ?? null,
    capabilities,
    permissions: [...roles.map((role) => `role:${role.toLowerCase()}`), ...Object.entries(capabilities).filter(([, enabled]) => enabled).map(([key]) => `cap:${key}`)],
    creatorRequestStatus: account.creatorApplications[0]?.status ?? null,
    brandRequestStatus: account.brandApplications[0]?.status ?? null
  };
}

export async function getCurrentUser(request: NextRequest): Promise<CurrentUser | null> {
  const session = await getCurrentSessionFromRequest(request);
  if (!session) return null;
  const cached = currentUserCache.get(session.sid);
  if (cached) return cached;

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
      creatorApplications: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
      brandApplications: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
      ownedBrandMemberships: {
        include: { brand: { select: { id: true, name: true } } }
      }
    }
  });
  if (!account || !account.isActive) return null;
  const mapped = mapAccountToCurrentUser(account, session.role);
  currentUserCache.set(session.sid, mapped);
  return mapped;
}

export async function getCurrentUserFromServer() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = decodeSession(token);
    const cached = currentUserCache.get(payload.sid);
    if (cached) return cached;
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
        creatorApplications: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
        brandApplications: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
        ownedBrandMemberships: { include: { brand: { select: { id: true, name: true } } } }
      }
    });
    if (!account || !account.isActive) return null;
    const mapped = mapAccountToCurrentUser(account, payload.role);
    currentUserCache.set(payload.sid, mapped);
    return mapped satisfies CurrentUser;
  } catch {
    return null;
  }
}

export async function requireCurrentUser(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) throw new AppError("Unauthorized", 401, "AUTH_UNAUTHORIZED");
  return user;
}
