ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'BRAND_OWNER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'BRAND_STAFF';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'OPS';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoleRequestType') THEN
    CREATE TYPE "RoleRequestType" AS ENUM ('CREATOR', 'BRAND');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoleRequestStatus') THEN
    CREATE TYPE "RoleRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "AuthSession" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RoleRequest" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "type" "RoleRequestType" NOT NULL,
  "status" "RoleRequestStatus" NOT NULL DEFAULT 'PENDING',
  "brandName" TEXT,
  "brandWebsite" TEXT,
  "note" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoleRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuthSession_accountId_idx" ON "AuthSession"("accountId");
CREATE INDEX IF NOT EXISTS "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE INDEX IF NOT EXISTS "RoleRequest_accountId_status_idx" ON "RoleRequest"("accountId", "status");
CREATE INDEX IF NOT EXISTS "RoleRequest_type_status_idx" ON "RoleRequest"("type", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AuthSession_accountId_fkey'
  ) THEN
    ALTER TABLE "AuthSession"
      ADD CONSTRAINT "AuthSession_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "Account"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RoleRequest_accountId_fkey'
  ) THEN
    ALTER TABLE "RoleRequest"
      ADD CONSTRAINT "RoleRequest_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "Account"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RoleRequest_reviewedById_fkey'
  ) THEN
    ALTER TABLE "RoleRequest"
      ADD CONSTRAINT "RoleRequest_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "Account"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
