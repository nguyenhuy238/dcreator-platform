-- AlterTable
DO $$
BEGIN
  IF to_regclass('"MissionApplication"') IS NOT NULL THEN
    ALTER TABLE "MissionApplication" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

-- RenameForeignKey
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CreatorMission_applicationId_fkey'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'CreatorMission_submissionId_fkey'
  ) THEN
    ALTER TABLE "CreatorMission"
      RENAME CONSTRAINT "CreatorMission_applicationId_fkey" TO "CreatorMission_submissionId_fkey";
  END IF;
END $$;
