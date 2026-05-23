-- AlterTable
ALTER TABLE "AuditLog"
ADD COLUMN "actorRole" "Role",
ADD COLUMN "oldStatus" TEXT,
ADD COLUMN "newStatus" TEXT,
ADD COLUMN "reason" TEXT;

