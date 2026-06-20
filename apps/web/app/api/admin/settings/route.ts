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
  campaignContentTemplateUrl: string;
  creatorDepositQrImageUrl: string;
  creatorDepositAccountName: string;
  creatorDepositAccountNumber: string;
  creatorDepositBankName: string;
  creatorDepositTransferPrefix: string;
};

const defaultSettings: AdminSettingsPayload = {
  reviewSlaHours: 24,
  payoutAutoThresholdVnd: 5_000_000,
  fraudScoreThreshold: 70,
  requireRejectReason: true,
  requireRequestChangesReason: true,
  maintenanceMessage: "",
  campaignContentTemplateUrl: "",
  creatorDepositQrImageUrl: "/qr-dcreator.jpg",
  creatorDepositAccountName: "",
  creatorDepositAccountNumber: "",
  creatorDepositBankName: "",
  creatorDepositTransferPrefix: "DCR"
};

async function getOrCreateSettings() {
  await prisma.$executeRaw`
    INSERT INTO "AdminSetting"
      ("id", "scope", "reviewSlaHours", "payoutAutoThresholdVnd", "fraudScoreThreshold", "requireRejectReason", "requireRequestChangesReason", "maintenanceMessage", "campaignContentTemplateUrl", "creatorDepositQrImageUrl", "creatorDepositAccountName", "creatorDepositAccountNumber", "creatorDepositBankName", "creatorDepositTransferPrefix", "createdAt", "updatedAt")
    VALUES
      ('admin-settings-global', 'global', ${defaultSettings.reviewSlaHours}, ${defaultSettings.payoutAutoThresholdVnd}, ${defaultSettings.fraudScoreThreshold}, ${defaultSettings.requireRejectReason}, ${defaultSettings.requireRequestChangesReason}, ${defaultSettings.maintenanceMessage}, ${defaultSettings.campaignContentTemplateUrl}, ${defaultSettings.creatorDepositQrImageUrl}, ${defaultSettings.creatorDepositAccountName}, ${defaultSettings.creatorDepositAccountNumber}, ${defaultSettings.creatorDepositBankName}, ${defaultSettings.creatorDepositTransferPrefix}, now(), now())
    ON CONFLICT ("scope") DO NOTHING
  `;
  const rows = await prisma.$queryRaw<Array<AdminSettingsPayload>>`
    SELECT
      "reviewSlaHours",
      "payoutAutoThresholdVnd",
      "fraudScoreThreshold",
      "requireRejectReason",
      "requireRequestChangesReason",
      "maintenanceMessage",
      "campaignContentTemplateUrl",
      "creatorDepositQrImageUrl",
      "creatorDepositAccountName",
      "creatorDepositAccountNumber",
      "creatorDepositBankName",
      "creatorDepositTransferPrefix"
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
    maintenanceMessage: String(body.maintenanceMessage ?? current.maintenanceMessage),
    campaignContentTemplateUrl: String(body.campaignContentTemplateUrl ?? current.campaignContentTemplateUrl),
    creatorDepositQrImageUrl: String(body.creatorDepositQrImageUrl ?? current.creatorDepositQrImageUrl).trim(),
    creatorDepositAccountName: String(body.creatorDepositAccountName ?? current.creatorDepositAccountName).trim(),
    creatorDepositAccountNumber: String(body.creatorDepositAccountNumber ?? current.creatorDepositAccountNumber).trim(),
    creatorDepositBankName: String(body.creatorDepositBankName ?? current.creatorDepositBankName).trim(),
    creatorDepositTransferPrefix: String(body.creatorDepositTransferPrefix ?? current.creatorDepositTransferPrefix).trim()
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
      "campaignContentTemplateUrl" = ${next.campaignContentTemplateUrl},
      "creatorDepositQrImageUrl" = ${next.creatorDepositQrImageUrl || defaultSettings.creatorDepositQrImageUrl},
      "creatorDepositAccountName" = ${next.creatorDepositAccountName},
      "creatorDepositAccountNumber" = ${next.creatorDepositAccountNumber},
      "creatorDepositBankName" = ${next.creatorDepositBankName},
      "creatorDepositTransferPrefix" = ${next.creatorDepositTransferPrefix || defaultSettings.creatorDepositTransferPrefix},
      "updatedAt" = now()
    WHERE "scope" = 'global'
  `;
  const saved = await getOrCreateSettings();
  return NextResponse.json({
    success: true,
    data: saved
  });
}
