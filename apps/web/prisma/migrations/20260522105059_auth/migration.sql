-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('TIKTOK', 'INSTAGRAM', 'YOUTUBE', 'FACEBOOK', 'OTHER');

-- CreateEnum
CREATE TYPE "BrandMemberRole" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "BrandStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REJECTED', 'PENDING_VERIFICATION');

-- CreateTable
CREATE TABLE "AccountRole" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorApplication" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "mainPlatform" "SocialPlatform" NOT NULL,
    "socialUrl" TEXT NOT NULL,
    "handle" TEXT,
    "followerCount" INTEGER,
    "contentCategory" TEXT,
    "portfolioUrl" TEXT,
    "location" TEXT,
    "expectedRate" INTEGER,
    "maxJobsPerMonth" INTEGER,
    "realName" TEXT,
    "phone" TEXT,
    "identityNumber" TEXT,
    "identityFrontUrl" TEXT,
    "identityBackUrl" TEXT,
    "selfieUrl" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankName" TEXT,
    "taxCode" TEXT,
    "rejectReason" TEXT,
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorProfile" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "mainPlatform" "SocialPlatform" NOT NULL,
    "socialUrl" TEXT NOT NULL,
    "handle" TEXT,
    "followerCount" INTEGER,
    "contentCategory" TEXT,
    "portfolioUrl" TEXT,
    "location" TEXT,
    "expectedRate" INTEGER,
    "maxJobsPerMonth" INTEGER,
    "realName" TEXT,
    "phone" TEXT,
    "identityNumber" TEXT,
    "identityFrontUrl" TEXT,
    "identityBackUrl" TEXT,
    "selfieUrl" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankName" TEXT,
    "taxCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandApplication" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "brandName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "legalName" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "fanpage" TEXT,
    "address" TEXT,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "description" TEXT,
    "businessGoal" TEXT,
    "taxCode" TEXT,
    "businessLicenseUrl" TEXT,
    "representativeName" TEXT,
    "representativePhone" TEXT,
    "representativeEmail" TEXT,
    "representativeIdentityNumber" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankName" TEXT,
    "productCategories" TEXT,
    "inventoryDescription" TEXT,
    "expectedCampaignBudget" INTEGER,
    "expectedCreatorCount" INTEGER,
    "rejectReason" TEXT,
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "ownerAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "legalName" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "fanpage" TEXT,
    "address" TEXT,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "description" TEXT,
    "businessGoal" TEXT,
    "taxCode" TEXT,
    "businessLicenseUrl" TEXT,
    "representativeName" TEXT,
    "representativePhone" TEXT,
    "representativeEmail" TEXT,
    "status" "BrandStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandMember" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" "BrandMemberRole" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountRole_role_createdAt_idx" ON "AccountRole"("role", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountRole_accountId_role_key" ON "AccountRole"("accountId", "role");

-- CreateIndex
CREATE INDEX "CreatorApplication_accountId_createdAt_idx" ON "CreatorApplication"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "CreatorApplication_status_createdAt_idx" ON "CreatorApplication"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_accountId_key" ON "CreatorProfile"("accountId");

-- CreateIndex
CREATE INDEX "BrandApplication_accountId_createdAt_idx" ON "BrandApplication"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "BrandApplication_status_createdAt_idx" ON "BrandApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BrandMember_accountId_role_idx" ON "BrandMember"("accountId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "BrandMember_brandId_accountId_key" ON "BrandMember"("brandId", "accountId");

-- AddForeignKey
ALTER TABLE "AccountRole" ADD CONSTRAINT "AccountRole_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorApplication" ADD CONSTRAINT "CreatorApplication_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorApplication" ADD CONSTRAINT "CreatorApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandApplication" ADD CONSTRAINT "BrandApplication_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandApplication" ADD CONSTRAINT "BrandApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMember" ADD CONSTRAINT "BrandMember_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMember" ADD CONSTRAINT "BrandMember_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
