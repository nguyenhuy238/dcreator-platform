import {
  BrandStatus,
  CampaignStatus,
  CreatorMissionStatus,
  MissionLifecycleStatus,
  PaymentTransactionStatus,
  PayoutRequestStatus,
  Prisma,
  Role
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

type Tx = Prisma.TransactionClient;

export type DeleteImpactSection = {
  entity: string;
  count: number;
  reason?: string;
};

export type DeleteImpact = {
  entityId: string;
  entityType: "USER" | "CREATOR" | "BRAND";
  canDeleteAccount: boolean;
  canHardDeleteAll: boolean;
  requiresAnonymization: boolean;
  requiresReassignment: boolean;
  blockers: Array<DeleteImpactSection & { type: string }>;
  cascadeDelete: DeleteImpactSection[];
  anonymizeAndRetain: DeleteImpactSection[];
  reassignRequired: DeleteImpactSection[];
  warnings: string[];
};

type Actor = { id: string; role: Role; roles: Role[] };

function assertAdmin(actor: Actor) {
  if (!actor.roles.includes(Role.ADMIN)) {
    throw new AppError("Chỉ ADMIN được phép thực hiện thao tác này", 403, "FORBIDDEN");
  }
}

function anonymizedEmail(id: string) {
  return `deleted+${id}@deleted.dcreator.local`;
}

function addSection(target: DeleteImpactSection[], entity: string, count: number, reason?: string) {
  if (count > 0) target.push({ entity, count, reason });
}

function addBlocker(target: DeleteImpact["blockers"], type: string, entity: string, count: number, reason: string) {
  if (count > 0) target.push({ type, entity, count, reason });
}

async function writeTxAudit(
  tx: Tx,
  input: {
    actorId: string;
    actorRole: Role;
    action: string;
    targetType: string;
    targetId: string;
    oldStatus?: string | null;
    newStatus?: string | null;
    reason?: string | null;
    metadata?: Prisma.InputJsonValue;
  }
) {
  return tx.auditLog.create({
    data: {
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      oldStatus: input.oldStatus ?? null,
      newStatus: input.newStatus ?? null,
      reason: input.reason ?? null,
      metadata: input.metadata ?? undefined
    }
  });
}

async function ensureNotLastAdmin(tx: Tx, accountId: string) {
  const account = await tx.account.findUnique({
    where: { id: accountId },
    select: { role: true, roleAssignments: { select: { role: true } } }
  });
  if (!account) throw new AppError("Không tìm thấy tài khoản", 404, "ENTITY_NOT_FOUND");
  const isAdmin = account.role === Role.ADMIN || account.roleAssignments.some((item) => item.role === Role.ADMIN);
  if (!isAdmin) return;

  const admins = await tx.account.count({
    where: {
      isActive: true,
      OR: [{ role: Role.ADMIN }, { roleAssignments: { some: { role: Role.ADMIN } } }]
    }
  });
  if (admins <= 1) {
    throw new AppError("Không thể xóa hoặc hạ quyền Admin cuối cùng", 409, "CANNOT_DELETE_LAST_ADMIN");
  }
}

export async function getAdminUserDetail(actor: Actor, userId: string) {
  assertAdmin(actor);
  const item = await prisma.account.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      wallet: true,
      roleAssignments: { select: { role: true } },
      creatorProfile: { select: { id: true, displayName: true, isSuspended: true } },
      ownedBrandMemberships: { include: { brand: { select: { id: true, name: true, status: true } } } },
      ownedBrands: { select: { id: true, name: true, status: true, isLocked: true } },
      _count: {
        select: {
          sessions: true,
          supports: true,
          submissions: true,
          creatorMissions: true,
          paymentTransactions: true,
          payoutRequests: true,
          auditLogs: true,
          notifications: true
        }
      }
    }
  });
  if (!item) throw new AppError("Không tìm thấy tài khoản", 404, "ENTITY_NOT_FOUND");
  return {
    id: item.id,
    email: item.email,
    displayName: item.displayName,
    avatarUrl: item.avatarUrl,
    role: item.role,
    roles: item.roleAssignments.map((role) => role.role),
    isActive: item.isActive,
    phone: item.profile?.phone ?? null,
    bio: item.profile?.bio ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    wallet: item.wallet
      ? {
          pointsBalance: item.wallet.pointsBalance,
          cashBalanceVnd: item.wallet.cashBalanceVnd,
          pendingPayoutVnd: item.wallet.pendingPayoutVnd,
          withdrawnPayoutVnd: item.wallet.withdrawnPayoutVnd
        }
      : null,
    creatorProfile: item.creatorProfile,
    brandMemberships: item.ownedBrandMemberships.map((member) => ({
      id: member.id,
      role: member.role,
      status: member.status,
      brand: member.brand
    })),
    ownedBrands: item.ownedBrands,
    counts: item._count
  };
}

export async function updateUserByAdmin(
  actor: Actor,
  userId: string,
  input: { displayName?: string; email?: string; phone?: string | null; role?: Role; isActive?: boolean; reason?: string }
) {
  assertAdmin(actor);
  if (actor.id === userId && (input.isActive === false || (input.role && input.role !== Role.ADMIN))) {
    throw new AppError("Không thể tự khóa hoặc tự hạ quyền Admin đang dùng", 409, "CANNOT_DELETE_SELF");
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.account.findUnique({
      where: { id: userId },
      include: { profile: true, roleAssignments: true }
    });
    if (!current) throw new AppError("Không tìm thấy tài khoản", 404, "ENTITY_NOT_FOUND");

    if ((input.role && input.role !== Role.ADMIN) || input.isActive === false) {
      await ensureNotLastAdmin(tx, userId);
    }

    if (input.email && input.email !== current.email) {
      const exists = await tx.account.findUnique({ where: { email: input.email }, select: { id: true } });
      if (exists && exists.id !== userId) throw new AppError("Email đã tồn tại", 409, "EMAIL_ALREADY_EXISTS");
    }

    if (input.phone && input.phone !== current.profile?.phone) {
      const exists = await tx.profile.findFirst({
        where: { phone: input.phone, accountId: { not: userId } },
        select: { id: true }
      });
      if (exists) throw new AppError("Số điện thoại đã tồn tại", 409, "PHONE_ALREADY_EXISTS");
    }

    const updated = await tx.account.update({
      where: { id: userId },
      data: {
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.email ? { email: input.email } : {}),
        ...(input.role ? { role: input.role } : {}),
        ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {})
      },
      select: { id: true, email: true, displayName: true, role: true, isActive: true }
    });

    if (input.role) {
      await tx.accountRole.deleteMany({ where: { accountId: userId } });
      await tx.accountRole.create({ data: { accountId: userId, role: input.role } });
    }

    if (input.phone !== undefined) {
      await tx.profile.upsert({
        where: { accountId: userId },
        create: { accountId: userId, phone: input.phone ?? null },
        update: { phone: input.phone ?? null }
      });
    }

    if (input.isActive === false) {
      await tx.authSession.updateMany({
        where: { accountId: userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }

    await writeTxAudit(tx, {
      actorId: actor.id,
      actorRole: actor.role,
      action: input.role && input.role !== current.role ? "ADMIN_CHANGE_USER_ROLE" : "ADMIN_UPDATE_USER",
      targetType: "Account",
      targetId: userId,
      oldStatus: `${current.role}:${current.isActive ? "active" : "locked"}`,
      newStatus: `${updated.role}:${updated.isActive ? "active" : "locked"}`,
      reason: input.reason ?? null,
      metadata: {
        before: {
          email: current.email,
          displayName: current.displayName,
          phone: current.profile?.phone ?? null,
          role: current.role,
          isActive: current.isActive
        },
        after: {
          email: updated.email,
          displayName: updated.displayName,
          phone: input.phone ?? current.profile?.phone ?? null,
          role: updated.role,
          isActive: updated.isActive
        }
      }
    });

    return updated;
  });
}

async function buildUserDeleteImpact(tx: Tx, accountId: string): Promise<DeleteImpact> {
  const account = await tx.account.findUnique({
    where: { id: accountId },
    select: { id: true, email: true, displayName: true, role: true, isActive: true }
  });
  if (!account) throw new AppError("Không tìm thấy tài khoản", 404, "ENTITY_NOT_FOUND");

  const [
    sessions,
    passwordTokens,
    roles,
    settings,
    profile,
    notifications,
    creatorProfile,
    creatorSocialLinks,
    brandMembers,
    creatorApplications,
    brandApplications,
    roleRequests,
    auditLogs,
    wallet,
    walletTransactions,
    paymentTransactions,
    pendingPayments,
    payoutRequests,
    pendingPayouts,
    contributions,
    rewardClaims,
    analyticsEvents,
    campaignsBrand,
    campaignsCreator,
    activeCampaigns,
    missionSubmissions,
    pendingProofs,
    creatorMissions,
    activeCreatorMissions,
    proofReviews,
    ownedBrands,
    supportTicketsRequested,
    supportTicketsAssigned,
    topupRequests
  ] = await Promise.all([
    tx.authSession.count({ where: { accountId } }),
    tx.passwordResetToken.count({ where: { accountId } }),
    tx.accountRole.count({ where: { accountId } }),
    tx.accountSettings.count({ where: { accountId } }),
    tx.profile.count({ where: { accountId } }),
    tx.notification.count({ where: { accountId } }),
    tx.creatorProfile.count({ where: { accountId } }),
    tx.creatorSocialLink.count({ where: { creatorProfile: { accountId } } }),
    tx.brandMember.count({ where: { accountId } }),
    tx.creatorApplication.count({ where: { accountId } }),
    tx.brandApplication.count({ where: { accountId } }),
    tx.roleRequest.count({ where: { accountId } }),
    tx.auditLog.count({ where: { actorId: accountId } }),
    tx.wallet.count({ where: { userId: accountId } }),
    tx.walletTransaction.count({ where: { accountId } }),
    tx.paymentTransaction.count({ where: { accountId } }),
    tx.paymentTransaction.count({ where: { accountId, status: PaymentTransactionStatus.PENDING } }),
    tx.payoutRequest.count({ where: { accountId } }),
    tx.payoutRequest.count({ where: { accountId, status: { in: [PayoutRequestStatus.PENDING, PayoutRequestStatus.APPROVED] } } }),
    tx.contribution.count({ where: { supporterId: accountId } }),
    tx.rewardClaim.count({ where: { accountId } }),
    tx.analyticsEvent.count({ where: { userId: accountId } }),
    tx.campaign.count({ where: { brandId: accountId } }),
    tx.campaign.count({ where: { creatorId: accountId } }),
    tx.campaign.count({ where: { OR: [{ brandId: accountId }, { creatorId: accountId }], status: CampaignStatus.ACTIVE } }),
    tx.missionSubmission.count({ where: { accountId } }),
    tx.missionSubmission.count({ where: { accountId, lifecycleStatus: MissionLifecycleStatus.PENDING_REVIEW } }),
    tx.creatorMission.count({ where: { accountId } }),
    tx.creatorMission.count({ where: { accountId, status: { in: [CreatorMissionStatus.PRODUCT_PENDING, CreatorMissionStatus.DRAFT_PENDING, CreatorMissionStatus.IN_PROGRESS] } } }),
    tx.proofReview.count({ where: { reviewerId: accountId } }),
    tx.brand.count({ where: { ownerAccountId: accountId } }),
    tx.supportTicket.count({ where: { requesterAccountId: accountId } }),
    tx.supportTicket.count({ where: { assigneeAccountId: accountId } }),
    tx.nPointTopupRequest.count({
      where: {
        OR: [{ requesterAccountId: accountId }, { reviewedById: accountId }, { refundProcessedById: accountId }]
      }
    })
  ]);

  const impact: DeleteImpact = {
    entityId: accountId,
    entityType: "USER",
    canDeleteAccount: true,
    canHardDeleteAll: false,
    requiresAnonymization: false,
    requiresReassignment: false,
    blockers: [],
    cascadeDelete: [],
    anonymizeAndRetain: [],
    reassignRequired: [],
    warnings: []
  };

  addSection(impact.cascadeDelete, "auth_sessions", sessions, "Thu hồi session đăng nhập");
  addSection(impact.cascadeDelete, "password_reset_tokens", passwordTokens);
  addSection(impact.cascadeDelete, "account_roles", roles);
  addSection(impact.cascadeDelete, "account_settings", settings);
  addSection(impact.cascadeDelete, "profile", profile);
  addSection(impact.cascadeDelete, "notifications", notifications);
  addSection(impact.cascadeDelete, "creator_profile", creatorProfile);
  addSection(impact.cascadeDelete, "creator_social_links", creatorSocialLinks);
  addSection(impact.cascadeDelete, "brand_memberships", brandMembers);
  addSection(impact.cascadeDelete, "creator_applications", creatorApplications);
  addSection(impact.cascadeDelete, "brand_applications", brandApplications);
  addSection(impact.cascadeDelete, "role_requests", roleRequests);

  addSection(impact.anonymizeAndRetain, "audit_logs", auditLogs, "Audit log phải được giữ nguyên để truy vết");
  addSection(impact.anonymizeAndRetain, "wallets", wallet, "Ví và ledger phải giữ để đối soát");
  addSection(impact.anonymizeAndRetain, "wallet_transactions", walletTransactions, "Không thay đổi ledger");
  addSection(impact.anonymizeAndRetain, "payment_transactions", paymentTransactions, "Thanh toán phải giữ để đối soát");
  addSection(impact.anonymizeAndRetain, "payout_requests", payoutRequests, "Payout history phải giữ");
  addSection(impact.anonymizeAndRetain, "contributions", contributions, "Lịch sử ủng hộ ảnh hưởng KPI");
  addSection(impact.anonymizeAndRetain, "reward_claims", rewardClaims, "Voucher/reward history phải giữ");
  addSection(impact.anonymizeAndRetain, "analytics_events", analyticsEvents, "Analytics được giữ nhưng bỏ liên kết user khi có thể");
  addSection(impact.anonymizeAndRetain, "campaigns_as_brand_account", campaignsBrand);
  addSection(impact.anonymizeAndRetain, "campaigns_as_creator", campaignsCreator);
  addSection(impact.anonymizeAndRetain, "mission_submissions", missionSubmissions);
  addSection(impact.anonymizeAndRetain, "creator_missions", creatorMissions);
  addSection(impact.anonymizeAndRetain, "proof_reviews", proofReviews);
  addSection(impact.anonymizeAndRetain, "support_tickets_requested", supportTicketsRequested);
  addSection(impact.anonymizeAndRetain, "support_tickets_assigned", supportTicketsAssigned);
  addSection(impact.anonymizeAndRetain, "n_point_topup_requests", topupRequests);

  addBlocker(impact.blockers, "PAYMENT_PENDING", "payment_transactions", pendingPayments, "Còn payment pending cần xử lý trước");
  addBlocker(impact.blockers, "PAYOUT_PENDING", "payout_requests", pendingPayouts, "Còn payout pending/approved cần xử lý trước");
  addBlocker(impact.blockers, "ACTIVE_CAMPAIGN", "campaigns", activeCampaigns, "Account còn campaign active");
  addBlocker(impact.blockers, "CREATOR_HAS_PENDING_PROOFS", "mission_submissions", pendingProofs, "Creator còn proof chờ duyệt");
  addBlocker(impact.blockers, "CREATOR_HAS_ACTIVE_MISSIONS", "creator_missions", activeCreatorMissions, "Creator còn mission đang chạy");
  addSection(impact.reassignRequired, "owned_brands", ownedBrands, "Phải chuyển owner Brand trước khi xóa hard-delete Account");

  impact.requiresReassignment = impact.reassignRequired.length > 0;
  impact.requiresAnonymization = impact.anonymizeAndRetain.length > 0 || impact.requiresReassignment;
  impact.canHardDeleteAll = !impact.requiresAnonymization && impact.blockers.length === 0;
  if (impact.requiresAnonymization) {
    impact.warnings.push("Không thể hard delete toàn bộ do có dữ liệu đối soát hoặc quan hệ bắt buộc. Hệ thống sẽ revoke quyền truy cập và anonymize PII.");
  }
  return impact;
}

export async function getUserDeleteImpact(actor: Actor, accountId: string) {
  assertAdmin(actor);
  const impact = await prisma.$transaction((tx) => buildUserDeleteImpact(tx, accountId));
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "ADMIN_VIEW_DELETE_IMPACT",
      targetType: "Account",
      targetId: accountId,
      metadata: impact as unknown as Prisma.InputJsonObject
    }
  });
  return impact;
}

async function scrubAccount(tx: Tx, accountId: string, actor: Actor, reason: string, action: string) {
  const now = new Date();
  await tx.authSession.updateMany({ where: { accountId, revokedAt: null }, data: { revokedAt: now } });
  await tx.passwordResetToken.deleteMany({ where: { accountId } });
  await tx.accountRole.deleteMany({ where: { accountId } });
  await tx.notification.deleteMany({ where: { accountId } });
  await tx.profile.deleteMany({ where: { accountId } });
  await tx.accountSettings.deleteMany({ where: { accountId } });
  await tx.creatorSocialLink.deleteMany({ where: { creatorProfile: { accountId } } });
  await tx.creatorProfile.deleteMany({ where: { accountId } });
  await tx.creatorApplication.updateMany({
    where: { accountId },
    data: {
      displayName: "Creator đã xóa",
      avatarUrl: null,
      bio: null,
      socialUrl: "https://deleted.dcreator.local",
      handle: null,
      portfolioUrl: null,
      location: null,
      realName: null,
      phone: null,
      identityNumber: null,
      identityFrontUrl: null,
      identityBackUrl: null,
      selfieUrl: null,
      bankAccountName: null,
      bankAccountNumber: null,
      bankName: null,
      taxCode: null
    }
  });
  await tx.brandApplication.updateMany({
    where: { accountId },
    data: {
      contactName: "Tài khoản đã xóa",
      contactPhone: "ANONYMIZED",
      contactEmail: anonymizedEmail(accountId),
      representativeName: null,
      representativePhone: null,
      representativeEmail: null,
      representativeIdentityNumber: null,
      bankAccountName: null,
      bankAccountNumber: null,
      bankName: null
    }
  });
  await tx.creatorBankAccount.updateMany({
    where: { accountId },
    data: {
      bankName: "ANONYMIZED",
      bankCode: null,
      bankBin: null,
      accountNumber: `ANONYMIZED-${accountId}`,
      accountHolderName: "Tài khoản đã xóa",
      isDefault: false
    }
  });
  await tx.payoutRequest.updateMany({
    where: { accountId, status: { notIn: [PayoutRequestStatus.PENDING, PayoutRequestStatus.APPROVED] } },
    data: {
      bankName: "ANONYMIZED",
      bankCode: null,
      bankBin: null,
      bankAccountName: "Tài khoản đã xóa",
      bankAccountNumber: "ANONYMIZED"
    }
  });
  await tx.analyticsEvent.updateMany({ where: { userId: accountId }, data: { userId: null } });
  const updated = await tx.account.update({
    where: { id: accountId },
    data: {
      email: anonymizedEmail(accountId),
      passwordHash: null,
      displayName: "Tài khoản đã xóa",
      avatarUrl: null,
      role: Role.USER,
      isActive: false
    },
    select: { id: true, email: true, displayName: true, isActive: true }
  });
  await writeTxAudit(tx, {
    actorId: actor.id,
    actorRole: actor.role,
    action: "ADMIN_ANONYMIZE_ENTITY",
    targetType: "Account",
    targetId: accountId,
    oldStatus: "active",
    newStatus: "anonymized",
    reason,
    metadata: { deleteAction: action, revokedSessionsAt: now.toISOString() }
  });
  return updated;
}

export async function deleteUserByAdmin(actor: Actor, accountId: string, input: { confirmation: string; reason: string }) {
  assertAdmin(actor);
  if (actor.id === accountId) throw new AppError("Không thể tự xóa tài khoản đang dùng", 409, "CANNOT_DELETE_SELF");

  return prisma.$transaction(async (tx) => {
    await ensureNotLastAdmin(tx, accountId);
    const account = await tx.account.findUnique({ where: { id: accountId }, select: { id: true, email: true, displayName: true } });
    if (!account) throw new AppError("Không tìm thấy tài khoản", 404, "ENTITY_NOT_FOUND");
    if (input.confirmation !== account.email && input.confirmation !== account.displayName) {
      throw new AppError("Xác nhận không khớp email hoặc tên tài khoản", 422, "VALIDATION_ERROR");
    }
    const impact = await buildUserDeleteImpact(tx, accountId);
    if (impact.blockers.length > 0) {
      throw new AppError("Không thể xóa tài khoản vì còn dữ liệu đang xử lý", 409, "USER_HAS_REQUIRED_RECORDS", impact.blockers);
    }
    if (impact.requiresReassignment) {
      throw new AppError("Tài khoản đang sở hữu Brand, cần chuyển quyền trước", 409, "OWNERSHIP_REASSIGNMENT_REQUIRED", impact.reassignRequired);
    }

    if (impact.canHardDeleteAll) {
      await tx.passwordResetToken.deleteMany({ where: { accountId } });
      await tx.authSession.deleteMany({ where: { accountId } });
      await tx.accountRole.deleteMany({ where: { accountId } });
      await tx.notification.deleteMany({ where: { accountId } });
      await tx.accountSettings.deleteMany({ where: { accountId } });
      await tx.profile.deleteMany({ where: { accountId } });
      await tx.creatorSocialLink.deleteMany({ where: { creatorProfile: { accountId } } });
      await tx.creatorProfile.deleteMany({ where: { accountId } });
      await tx.creatorApplication.deleteMany({ where: { accountId } });
      await tx.brandApplication.deleteMany({ where: { accountId } });
      await tx.roleRequest.deleteMany({ where: { accountId } });
      await tx.brandMember.deleteMany({ where: { accountId } });
      await tx.account.delete({ where: { id: accountId } });
      await writeTxAudit(tx, {
        actorId: actor.id,
        actorRole: actor.role,
        action: "ADMIN_DELETE_USER",
        targetType: "Account",
        targetId: accountId,
        oldStatus: "active",
        newStatus: "hard_deleted",
        reason: input.reason,
        metadata: impact as unknown as Prisma.InputJsonObject
      });
      return { mode: "HARD_DELETE", impact };
    }

    await scrubAccount(tx, accountId, actor, input.reason, "ADMIN_DELETE_USER");
    await writeTxAudit(tx, {
      actorId: actor.id,
      actorRole: actor.role,
      action: "ADMIN_DELETE_USER",
      targetType: "Account",
      targetId: accountId,
      oldStatus: "active",
      newStatus: "account_revoked_pii_anonymized",
      reason: input.reason,
      metadata: impact as unknown as Prisma.InputJsonObject
    });
    return { mode: "ACCOUNT_REVOKED_PII_ANONYMIZED", impact };
  });
}

export async function updateCreatorByAdmin(actor: Actor, creatorId: string, input: Prisma.CreatorProfileUpdateInput & { reason?: string }) {
  assertAdmin(actor);
  return prisma.$transaction(async (tx) => {
    const current = await tx.creatorProfile.findUnique({ where: { id: creatorId } });
    if (!current) throw new AppError("Không tìm thấy Creator", 404, "ENTITY_NOT_FOUND");
    const updated = await tx.creatorProfile.update({
      where: { id: creatorId },
      data: {
        displayName: input.displayName,
        bio: input.bio,
        mainPlatform: input.mainPlatform,
        socialUrl: input.socialUrl,
        handle: input.handle,
        contentCategory: input.contentCategory,
        portfolioUrl: input.portfolioUrl,
        location: input.location,
        expectedRate: input.expectedRate,
        maxJobsPerMonth: input.maxJobsPerMonth,
        isSuspended: input.isSuspended,
        suspendedReason: input.suspendedReason,
        ...(input.isSuspended === true ? { suspendedAt: new Date() } : {}),
        ...(input.isSuspended === false ? { unsuspendedAt: new Date(), unsuspendedReason: input.reason ?? "Admin update" } : {})
      }
    });
    await writeTxAudit(tx, {
      actorId: actor.id,
      actorRole: actor.role,
      action: "ADMIN_UPDATE_CREATOR",
      targetType: "CreatorProfile",
      targetId: creatorId,
      oldStatus: current.isSuspended ? "suspended" : "active",
      newStatus: updated.isSuspended ? "suspended" : "active",
      reason: input.reason ?? null,
      metadata: { before: current, after: updated } as unknown as Prisma.InputJsonObject
    });
    return updated;
  });
}

async function buildCreatorDeleteImpact(tx: Tx, creatorId: string): Promise<DeleteImpact & { accountId: string; confirmation: string }> {
  const creator = await tx.creatorProfile.findUnique({
    where: { id: creatorId },
    select: { id: true, accountId: true, displayName: true, account: { select: { email: true } } }
  });
  if (!creator) throw new AppError("Không tìm thấy Creator", 404, "ENTITY_NOT_FOUND");
  const userImpact = await buildUserDeleteImpact(tx, creator.accountId);
  const impact: DeleteImpact & { accountId: string; confirmation: string } = {
    ...userImpact,
    entityId: creatorId,
    entityType: "CREATOR",
    accountId: creator.accountId,
    confirmation: creator.displayName
  };
  return impact;
}

export async function getCreatorDeleteImpact(actor: Actor, creatorId: string) {
  assertAdmin(actor);
  const impact = await prisma.$transaction((tx) => buildCreatorDeleteImpact(tx, creatorId));
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "ADMIN_VIEW_DELETE_IMPACT",
      targetType: "CreatorProfile",
      targetId: creatorId,
      metadata: impact as unknown as Prisma.InputJsonObject
    }
  });
  return impact;
}

export async function deleteCreatorByAdmin(
  actor: Actor,
  creatorId: string,
  input: { confirmation: string; reason: string; mode?: "DELETE_ENTITY_ONLY" | "DELETE_WITH_ACCOUNT" | "ANONYMIZE_RETAIN" }
) {
  assertAdmin(actor);
  return prisma.$transaction(async (tx) => {
    const creator = await tx.creatorProfile.findUnique({ where: { id: creatorId }, select: { id: true, accountId: true, displayName: true } });
    if (!creator) throw new AppError("Không tìm thấy Creator", 404, "ENTITY_NOT_FOUND");
    if (input.confirmation !== creator.displayName) throw new AppError("Xác nhận không khớp tên Creator", 422, "VALIDATION_ERROR");
    const impact = await buildCreatorDeleteImpact(tx, creatorId);
    if (impact.blockers.length > 0) {
      throw new AppError("Không thể xóa Creator vì còn workflow đang xử lý", 409, "CREATOR_HAS_ACTIVE_MISSIONS", impact.blockers);
    }

    const mode = input.mode ?? "DELETE_ENTITY_ONLY";
    if (mode === "DELETE_WITH_ACCOUNT") {
      if (actor.id === creator.accountId) throw new AppError("Không thể tự xóa tài khoản đang dùng", 409, "CANNOT_DELETE_SELF");
      await ensureNotLastAdmin(tx, creator.accountId);
      if (impact.requiresReassignment) {
        throw new AppError("Account Creator đang sở hữu Brand, cần chuyển quyền trước", 409, "OWNERSHIP_REASSIGNMENT_REQUIRED", impact.reassignRequired);
      }
      if (impact.canHardDeleteAll) {
        await tx.creatorSocialLink.deleteMany({ where: { creatorProfileId: creatorId } });
        await tx.creatorProfile.delete({ where: { id: creatorId } });
        await tx.account.delete({ where: { id: creator.accountId } });
      } else {
        await scrubAccount(tx, creator.accountId, actor, input.reason, "ADMIN_DELETE_CREATOR");
      }
    } else if (mode === "ANONYMIZE_RETAIN") {
      await tx.creatorSocialLink.deleteMany({ where: { creatorProfileId: creatorId } });
      await tx.creatorProfile.update({
        where: { id: creatorId },
        data: {
          displayName: "Creator đã xóa",
          avatarUrl: null,
          bio: null,
          socialUrl: null,
          handle: null,
          portfolioUrl: null,
          location: null,
          realName: null,
          phone: null,
          identityNumber: null,
          identityFrontUrl: null,
          identityBackUrl: null,
          selfieUrl: null,
          bankAccountName: null,
          bankAccountNumber: null,
          bankName: null,
          taxCode: null,
          isSuspended: true,
          suspendedAt: new Date(),
          suspendedReason: input.reason
        }
      });
      await tx.accountRole.deleteMany({ where: { accountId: creator.accountId, role: Role.CREATOR } });
    } else {
      await tx.creatorSocialLink.deleteMany({ where: { creatorProfileId: creatorId } });
      await tx.creatorProfile.delete({ where: { id: creatorId } });
      await tx.accountRole.deleteMany({ where: { accountId: creator.accountId, role: Role.CREATOR } });
    }

    await writeTxAudit(tx, {
      actorId: actor.id,
      actorRole: actor.role,
      action: "ADMIN_DELETE_CREATOR",
      targetType: "CreatorProfile",
      targetId: creatorId,
      oldStatus: "active",
      newStatus: mode,
      reason: input.reason,
      metadata: impact as unknown as Prisma.InputJsonObject
    });
    return { mode, impact };
  });
}

export async function updateBrandByAdmin(actor: Actor, brandId: string, input: Prisma.BrandUpdateInput & { reason?: string }) {
  assertAdmin(actor);
  return prisma.$transaction(async (tx) => {
    const current = await tx.brand.findUnique({ where: { id: brandId } });
    if (!current) throw new AppError("Không tìm thấy Brand", 404, "ENTITY_NOT_FOUND");
    const updated = await tx.brand.update({
      where: { id: brandId },
      data: {
        name: input.name,
        legalName: input.legalName,
        industry: input.industry,
        website: input.website,
        fanpage: input.fanpage,
        address: input.address,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        description: input.description,
        businessGoal: input.businessGoal,
        taxCode: input.taxCode,
        productCategories: input.productCategories,
        inventoryDescription: input.inventoryDescription,
        status: input.status,
        isLocked: input.isLocked,
        lockReason: input.lockReason,
        ...(input.isLocked === true ? { lockedAt: new Date() } : {}),
        ...(input.isLocked === false ? { unlockedAt: new Date(), unlockReason: input.reason ?? "Admin update" } : {})
      }
    });
    await writeTxAudit(tx, {
      actorId: actor.id,
      actorRole: actor.role,
      action: "ADMIN_UPDATE_BRAND",
      targetType: "Brand",
      targetId: brandId,
      oldStatus: `${current.status}:${current.isLocked ? "locked" : "unlocked"}`,
      newStatus: `${updated.status}:${updated.isLocked ? "locked" : "unlocked"}`,
      reason: input.reason ?? null,
      metadata: { before: current, after: updated } as unknown as Prisma.InputJsonObject
    });
    return updated;
  });
}

async function buildBrandDeleteImpact(tx: Tx, brandId: string): Promise<DeleteImpact & { confirmation: string }> {
  const brand = await tx.brand.findUnique({ where: { id: brandId }, select: { id: true, name: true, ownerAccountId: true } });
  if (!brand) throw new AppError("Không tìm thấy Brand", 404, "ENTITY_NOT_FOUND");
  const [
    members,
    products,
    productBatches,
    productSubmissions,
    subscription,
    campaignRequests,
    activeCreatedCampaigns,
    completedCreatedCampaigns,
    nPointTopups,
    pendingTopups,
    ownerCampaigns,
    auditLogs
  ] = await Promise.all([
    tx.brandMember.count({ where: { brandId } }),
    tx.brandProduct.count({ where: { brandId } }),
    tx.brandInventoryBatch.count({ where: { product: { brandId } } }),
    tx.productSubmission.count({ where: { brandId } }),
    tx.brandSubscription.count({ where: { brandId } }),
    tx.brandCampaignRequest.count({ where: { brandId } }),
    tx.brandCampaignRequest.count({ where: { brandId, createdCampaign: { status: CampaignStatus.ACTIVE } } }),
    tx.brandCampaignRequest.count({ where: { brandId, createdCampaign: { status: CampaignStatus.COMPLETED } } }),
    tx.nPointTopupRequest.count({ where: { brandId } }),
    tx.nPointTopupRequest.count({ where: { brandId, status: "PENDING_ADMIN_REVIEW" } }),
    tx.campaign.count({ where: { brandId: brand.ownerAccountId } }),
    tx.auditLog.count({ where: { targetType: "Brand", targetId: brandId } })
  ]);

  const impact: DeleteImpact & { confirmation: string } = {
    entityId: brandId,
    entityType: "BRAND",
    confirmation: brand.name,
    canDeleteAccount: false,
    canHardDeleteAll: false,
    requiresAnonymization: false,
    requiresReassignment: false,
    blockers: [],
    cascadeDelete: [],
    anonymizeAndRetain: [],
    reassignRequired: [],
    warnings: []
  };
  addSection(impact.cascadeDelete, "brand_members", members);
  addSection(impact.cascadeDelete, "brand_products", products);
  addSection(impact.cascadeDelete, "brand_inventory_batches", productBatches);
  addSection(impact.cascadeDelete, "product_submissions", productSubmissions);
  addSection(impact.cascadeDelete, "brand_subscription", subscription);
  addSection(impact.cascadeDelete, "brand_campaign_requests", campaignRequests);
  addSection(impact.anonymizeAndRetain, "completed_campaigns_from_requests", completedCreatedCampaigns, "Campaign completed phải giữ để báo cáo");
  addSection(impact.anonymizeAndRetain, "n_point_topup_requests", nPointTopups, "N-Point topup là dữ liệu tài chính");
  addSection(impact.anonymizeAndRetain, "owner_account_campaigns", ownerCampaigns, "Campaign legacy đang liên kết owner account");
  addSection(impact.anonymizeAndRetain, "audit_logs", auditLogs, "Audit log phải giữ nguyên");
  addBlocker(impact.blockers, "BRAND_HAS_ACTIVE_CAMPAIGNS", "campaigns", activeCreatedCampaigns, "Brand còn campaign active");
  addBlocker(impact.blockers, "BRAND_HAS_FINANCIAL_RECORDS", "n_point_topup_requests", pendingTopups, "Brand còn topup pending cần xử lý trước");
  impact.requiresAnonymization = impact.anonymizeAndRetain.length > 0;
  impact.canHardDeleteAll = !impact.requiresAnonymization && impact.blockers.length === 0;
  if (impact.requiresAnonymization) impact.warnings.push("Brand có dữ liệu cần đối soát; sẽ anonymize Brand thay vì xóa record nghiệp vụ.");
  return impact;
}

export async function getBrandDeleteImpact(actor: Actor, brandId: string) {
  assertAdmin(actor);
  const impact = await prisma.$transaction((tx) => buildBrandDeleteImpact(tx, brandId));
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "ADMIN_VIEW_DELETE_IMPACT",
      targetType: "Brand",
      targetId: brandId,
      metadata: impact as unknown as Prisma.InputJsonObject
    }
  });
  return impact;
}

export async function deleteBrandByAdmin(actor: Actor, brandId: string, input: { confirmation: string; reason: string }) {
  assertAdmin(actor);
  return prisma.$transaction(async (tx) => {
    const brand = await tx.brand.findUnique({ where: { id: brandId }, select: { id: true, name: true, status: true, isLocked: true } });
    if (!brand) throw new AppError("Không tìm thấy Brand", 404, "ENTITY_NOT_FOUND");
    if (input.confirmation !== brand.name) throw new AppError("Xác nhận không khớp tên Brand", 422, "VALIDATION_ERROR");
    const impact = await buildBrandDeleteImpact(tx, brandId);
    if (impact.blockers.length > 0) {
      throw new AppError("Không thể xóa Brand vì còn dữ liệu đang xử lý", 409, "BRAND_HAS_ACTIVE_CAMPAIGNS", impact.blockers);
    }

    if (impact.canHardDeleteAll) {
      await tx.brand.delete({ where: { id: brandId } });
      await writeTxAudit(tx, {
        actorId: actor.id,
        actorRole: actor.role,
        action: "ADMIN_DELETE_BRAND",
        targetType: "Brand",
        targetId: brandId,
        oldStatus: `${brand.status}:${brand.isLocked ? "locked" : "unlocked"}`,
        newStatus: "hard_deleted",
        reason: input.reason,
        metadata: impact as unknown as Prisma.InputJsonObject
      });
      return { mode: "HARD_DELETE", impact };
    }

    await tx.brand.update({
      where: { id: brandId },
      data: {
        name: `Brand đã xóa ${brandId.slice(-6)}`,
        logoUrl: null,
        legalName: null,
        website: null,
        brandLinks: Prisma.JsonNull,
        fanpage: null,
        address: null,
        contactName: "Brand đã xóa",
        contactPhone: "ANONYMIZED",
        contactEmail: `deleted+brand-${brandId}@deleted.dcreator.local`,
        description: null,
        businessGoal: null,
        taxCode: null,
        businessLicenseUrl: null,
        representativeName: null,
        representativePhone: null,
        representativeEmail: null,
        productCategories: null,
        inventoryDescription: null,
        status: BrandStatus.LOCKED,
        isLocked: true,
        lockedAt: new Date(),
        lockReason: input.reason
      }
    });
    await tx.brandMember.updateMany({ where: { brandId }, data: { status: "INACTIVE" } });
    await writeTxAudit(tx, {
      actorId: actor.id,
      actorRole: actor.role,
      action: "ADMIN_DELETE_BRAND",
      targetType: "Brand",
      targetId: brandId,
      oldStatus: `${brand.status}:${brand.isLocked ? "locked" : "unlocked"}`,
      newStatus: "brand_locked_pii_anonymized",
      reason: input.reason,
      metadata: impact as unknown as Prisma.InputJsonObject
    });
    return { mode: "BRAND_LOCKED_PII_ANONYMIZED", impact };
  });
}
