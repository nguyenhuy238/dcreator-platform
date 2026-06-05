DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TranscriptSubmissionType') THEN
    CREATE TYPE "TranscriptSubmissionType" AS ENUM ('TEXT', 'FILE', 'URL');
  END IF;
END $$;

ALTER TABLE "CreatorMission"
  ADD COLUMN IF NOT EXISTS "submissionTranscriptType" "TranscriptSubmissionType",
  ADD COLUMN IF NOT EXISTS "submissionTranscriptTextNote" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionTranscriptResourceUrl" TEXT;

UPDATE "CreatorMission"
SET
  "submissionTranscriptType" = CASE
    WHEN COALESCE(TRIM("submissionTranscriptTextNote"), '') <> '' THEN 'TEXT'::"TranscriptSubmissionType"
    WHEN COALESCE(TRIM("submissionTranscriptResourceUrl"), '') <> '' THEN "submissionTranscriptType"
    WHEN COALESCE(TRIM("submissionProofTextNote"), '') <> '' THEN 'TEXT'::"TranscriptSubmissionType"
    WHEN COALESCE(TRIM("submissionFileUploadUrl"), '') <> '' AND "submissionFileUploadUrl" LIKE '/uploads/creator-transcript/%' THEN 'FILE'::"TranscriptSubmissionType"
    WHEN COALESCE(TRIM("submissionFileUploadUrl"), '') <> '' THEN 'URL'::"TranscriptSubmissionType"
    ELSE "submissionTranscriptType"
  END,
  "submissionTranscriptTextNote" = COALESCE(
    NULLIF("submissionTranscriptTextNote", ''),
    CASE
      WHEN COALESCE(TRIM("submissionProofTextNote"), '') <> '' AND "status" = 'DRAFT_PENDING'::"CreatorMissionStatus" THEN "submissionProofTextNote"
      ELSE NULL
    END
  ),
  "submissionTranscriptResourceUrl" = COALESCE(
    NULLIF("submissionTranscriptResourceUrl", ''),
    CASE
      WHEN COALESCE(TRIM("submissionFileUploadUrl"), '') <> '' AND "status" = 'DRAFT_PENDING'::"CreatorMissionStatus" THEN "submissionFileUploadUrl"
      ELSE NULL
    END
  )
WHERE
  "submissionTranscriptType" IS NULL
  OR "submissionTranscriptTextNote" IS NULL
  OR "submissionTranscriptResourceUrl" IS NULL;
