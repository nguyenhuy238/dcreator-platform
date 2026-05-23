import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { hasRole } from "@/lib/auth/dashboard-access";
import { DASHBOARD_ACCESS } from "@/lib/auth/role-constants";
import { prisma } from "@/lib/db";

type AdminSettingsPayload = {
  reviewSlaHours: number;
  payoutAutoThresholdVnd: number;
  fraudScoreThreshold: number;
  requireRejectReason: boolean;
  requireRequestChangesReason: boolean;
  maintenanceMessage: string;
};

const defaultSettings: AdminSettingsPayload = {
  reviewSlaHours: 24,
  payoutAutoThresholdVnd: 5_000_000,
  fraudScoreThreshold: 70,
  requireRejectReason: true,
  requireRequestChangesReason: true,
  maintenanceMessage: ""
};

async function getOrCreateSettings() {
  await prisma.$executeRaw`
    INSERT INTO "AdminSetting"
      ("id", "scope", "reviewSlaHours", "payoutAutoThresholdVnd", "fraudScoreThreshold", "requireRejectReason", "requireRequestChangesReason", "maintenanceMessage", "createdAt", "updatedAt")
    VALUES
      ('admin-settings-global', 'global', ${defaultSettings.reviewSlaHours}, ${defaultSettings.payoutAutoThresholdVnd}, ${defaultSettings.fraudScoreThreshold}, ${defaultSettings.requireRejectReason}, ${defaultSettings.requireRequestChangesReason}, ${defaultSettings.maintenanceMessage}, now(), now())
    ON CONFLICT ("scope") DO NOTHING
  `;
  const rows = await prisma.$queryRaw<Array<AdminSettingsPayload>>`
    SELECT
      "reviewSlaHours",
      "payoutAutoThresholdVnd",
      "fraudScoreThreshold",
      "requireRejectReason",
      "requireRequestChangesReason",
      "maintenanceMessage"
    FROM "AdminSetting"
    WHERE "scope" = 'global'
    LIMIT 1
  `;
  return rows[0] ?? defaultSettings;
}

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!hasRole(user.roles, DASHBOARD_ACCESS.admin)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  const settings = await getOrCreateSettings();
  return NextResponse.json({
    success: true,
    data: settings
  });
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!hasRole(user.roles, DASHBOARD_ACCESS.admin)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as Partial<AdminSettingsPayload>;
  const current = await getOrCreateSettings();
  const next: AdminSettingsPayload = {
    reviewSlaHours: Number(body.reviewSlaHours ?? current.reviewSlaHours),
    payoutAutoThresholdVnd: Number(body.payoutAutoThresholdVnd ?? current.payoutAutoThresholdVnd),
    fraudScoreThreshold: Number(body.fraudScoreThreshold ?? current.fraudScoreThreshold),
    requireRejectReason: Boolean(body.requireRejectReason ?? current.requireRejectReason),
    requireRequestChangesReason: Boolean(body.requireRequestChangesReason ?? current.requireRequestChangesReason),
    maintenanceMessage: String(body.maintenanceMessage ?? current.maintenanceMessage)
  };
  if (next.reviewSlaHours < 1 || next.reviewSlaHours > 168) {
    return NextResponse.json({ success: false, error: "reviewSlaHours phải từ 1 đến 168." }, { status: 400 });
  }
  if (next.fraudScoreThreshold < 0 || next.fraudScoreThreshold > 100) {
    return NextResponse.json({ success: false, error: "fraudScoreThreshold phải từ 0 đến 100." }, { status: 400 });
  }
  await prisma.$executeRaw`
    UPDATE "AdminSetting"
    SET
      "reviewSlaHours" = ${next.reviewSlaHours},
      "payoutAutoThresholdVnd" = ${next.payoutAutoThresholdVnd},
      "fraudScoreThreshold" = ${next.fraudScoreThreshold},
      "requireRejectReason" = ${next.requireRejectReason},
      "requireRequestChangesReason" = ${next.requireRequestChangesReason},
      "maintenanceMessage" = ${next.maintenanceMessage},
      "updatedAt" = now()
    WHERE "scope" = 'global'
  `;
  const saved = await getOrCreateSettings();
  return NextResponse.json({
    success: true,
    data: saved
  });
}
