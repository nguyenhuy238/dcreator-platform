import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const CONFIRM_TEXT = "DELETE_DEPLOY_CAMPAIGNS";

function loadEnvFile(path) {
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

if (!process.env.DATABASE_URL) {
  loadEnvFile("apps/web/.env");
}

if (process.env.ALLOW_DEPLOY_CAMPAIGN_DELETE !== "true") {
  throw new Error("Blocked campaign delete: set ALLOW_DEPLOY_CAMPAIGN_DELETE=true.");
}

if (process.env.DELETE_DEPLOY_CAMPAIGNS_CONFIRM !== CONFIRM_TEXT) {
  throw new Error(`Blocked campaign delete: set DELETE_DEPLOY_CAMPAIGNS_CONFIRM=${CONFIRM_TEXT}.`);
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient();

const statements = [
  `CREATE TEMP TABLE "_delete_campaign_ids" ON COMMIT DROP AS SELECT "id" FROM "Campaign"`,
  `CREATE TEMP TABLE "_delete_mission_ids" ON COMMIT DROP AS SELECT "id" FROM "Mission" WHERE "campaignId" IN (SELECT "id" FROM "_delete_campaign_ids")`,
  `CREATE TEMP TABLE "_delete_creator_mission_ids" ON COMMIT DROP AS SELECT "id" FROM "CreatorMission" WHERE "campaignId" IN (SELECT "id" FROM "_delete_campaign_ids")`,
  `CREATE TEMP TABLE "_delete_submission_ids" ON COMMIT DROP AS SELECT "id" FROM "MissionSubmission" WHERE "missionId" IN (SELECT "id" FROM "_delete_mission_ids")`,
  `CREATE TEMP TABLE "_delete_reward_ids" ON COMMIT DROP AS SELECT "id" FROM "Reward" WHERE "campaignId" IN (SELECT "id" FROM "_delete_campaign_ids")`,
  `CREATE TEMP TABLE "_delete_contribution_ids" ON COMMIT DROP AS SELECT "id" FROM "Contribution" WHERE "campaignId" IN (SELECT "id" FROM "_delete_campaign_ids")`,
  `CREATE TEMP TABLE "_delete_payment_transaction_ids" ON COMMIT DROP AS SELECT "paymentTransactionId" AS "id" FROM "Contribution" WHERE "campaignId" IN (SELECT "id" FROM "_delete_campaign_ids") AND "paymentTransactionId" IS NOT NULL`,
  `CREATE TEMP TABLE "_delete_product_submission_ids" ON COMMIT DROP AS SELECT "id" FROM "ProductSubmission" WHERE "campaignId" IN (SELECT "id" FROM "_delete_campaign_ids")`,
  `CREATE TEMP TABLE "_delete_inventory_batch_ids" ON COMMIT DROP AS SELECT "id" FROM "InventoryBatch" WHERE "productSubmissionId" IN (SELECT "id" FROM "_delete_product_submission_ids")`,
  `CREATE TEMP TABLE "_delete_support_ticket_ids" ON COMMIT DROP AS SELECT "id" FROM "SupportTicket" WHERE "relatedCampaignId" IN (SELECT "id" FROM "_delete_campaign_ids")`,

  `DELETE FROM "SupportTicketComment" WHERE "ticketId" IN (SELECT "id" FROM "_delete_support_ticket_ids")`,
  `DELETE FROM "SupportTicket" WHERE "id" IN (SELECT "id" FROM "_delete_support_ticket_ids")`,
  `DELETE FROM "InternalNote" WHERE ("targetType" = 'Campaign' AND "targetId" IN (SELECT "id" FROM "_delete_campaign_ids")) OR ("targetType" = 'Mission' AND "targetId" IN (SELECT "id" FROM "_delete_mission_ids")) OR ("targetType" = 'MissionSubmission' AND "targetId" IN (SELECT "id" FROM "_delete_submission_ids")) OR ("targetType" = 'CreatorMission' AND "targetId" IN (SELECT "id" FROM "_delete_creator_mission_ids"))`,
  `DELETE FROM "RiskFlag" WHERE ("targetType" IN ('Campaign', 'Contribution') AND "targetId" IN (SELECT "id" FROM "_delete_campaign_ids")) OR ("targetType" = 'MissionSubmission' AND "targetId" IN (SELECT "id" FROM "_delete_submission_ids")) OR ("targetType" = 'PaymentTransaction' AND "targetId" IN (SELECT "id" FROM "_delete_payment_transaction_ids"))`,
  `DELETE FROM "AuditLog" WHERE ("targetType" = 'Campaign' AND "targetId" IN (SELECT "id" FROM "_delete_campaign_ids")) OR ("targetType" = 'Mission' AND "targetId" IN (SELECT "id" FROM "_delete_mission_ids")) OR ("targetType" = 'MissionSubmission' AND "targetId" IN (SELECT "id" FROM "_delete_submission_ids")) OR ("targetType" = 'CreatorMission' AND "targetId" IN (SELECT "id" FROM "_delete_creator_mission_ids")) OR ("targetType" = 'RewardClaim' AND "metadata"->>'campaignId' IN (SELECT "id" FROM "_delete_campaign_ids")) OR ("targetType" = 'PaymentTransaction' AND "targetId" IN (SELECT "id" FROM "_delete_payment_transaction_ids"))`,
  `DELETE FROM "Notification" WHERE "metadata"->>'campaignId' IN (SELECT "id" FROM "_delete_campaign_ids")`,
  `DELETE FROM "AnalyticsEvent" WHERE "campaignId" IN (SELECT "id" FROM "_delete_campaign_ids")`,
  `DELETE FROM "AnalyticsDaily" WHERE "campaignId" IN (SELECT "id" FROM "_delete_campaign_ids")`,
  `DELETE FROM "PaymentOrder" WHERE "campaignId" IN (SELECT "id" FROM "_delete_campaign_ids")`,
  `DELETE FROM "ProofReview" WHERE "submissionId" IN (SELECT "id" FROM "_delete_submission_ids") OR "missionId" IN (SELECT "id" FROM "_delete_mission_ids")`,
  `DELETE FROM "CreatorMission" WHERE "id" IN (SELECT "id" FROM "_delete_creator_mission_ids")`,
  `DELETE FROM "MissionSubmission" WHERE "id" IN (SELECT "id" FROM "_delete_submission_ids")`,
  `DELETE FROM "MissionApplication" WHERE "campaignId" IN (SELECT "id" FROM "_delete_campaign_ids")`,
  `DELETE FROM "FulfillmentOrder" WHERE "campaignId" IN (SELECT "id" FROM "_delete_campaign_ids") OR "inventoryBatchId" IN (SELECT "id" FROM "_delete_inventory_batch_ids")`,
  `DELETE FROM "InventoryBatch" WHERE "id" IN (SELECT "id" FROM "_delete_inventory_batch_ids")`,
  `DELETE FROM "ProductSubmission" WHERE "id" IN (SELECT "id" FROM "_delete_product_submission_ids")`,
  `DELETE FROM "RewardClaim" WHERE "rewardId" IN (SELECT "id" FROM "_delete_reward_ids") OR "contributionId" IN (SELECT "id" FROM "_delete_contribution_ids")`,
  `DELETE FROM "WalletTransaction" WHERE ("referenceType" = 'CAMPAIGN' AND "referenceId" IN (SELECT "id" FROM "_delete_campaign_ids")) OR ("referenceType" = 'CONTRIBUTION' AND "referenceId" IN (SELECT "id" FROM "_delete_contribution_ids")) OR ("referenceType" = 'PAYMENT_TRANSACTION' AND "referenceId" IN (SELECT "id" FROM "_delete_payment_transaction_ids"))`,
  `DELETE FROM "Contribution" WHERE "id" IN (SELECT "id" FROM "_delete_contribution_ids")`,
  `DELETE FROM "PaymentTransaction" WHERE "id" IN (SELECT "id" FROM "_delete_payment_transaction_ids")`,
  `DELETE FROM "Reward" WHERE "id" IN (SELECT "id" FROM "_delete_reward_ids")`,
  `DELETE FROM "Mission" WHERE "id" IN (SELECT "id" FROM "_delete_mission_ids")`,
  `DELETE FROM "Campaign" WHERE "id" IN (SELECT "id" FROM "_delete_campaign_ids")`
];

try {
  const before = await prisma.campaign.count();
  console.log(`Deleting ${before} campaigns and related campaign data...`);
  await prisma.$transaction(statements.map((statement) => prisma.$executeRawUnsafe(statement)), {
    timeout: 120_000
  });
  const after = await prisma.campaign.count();
  console.log(`Campaign delete complete. Remaining campaigns: ${after}`);
} finally {
  await prisma.$disconnect();
}
