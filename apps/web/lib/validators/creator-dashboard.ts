import { z } from "zod";

const supportedPlatforms = ["TikTok", "Instagram", "YouTube", "Facebook"] as const;
const isAbsoluteUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol && parsed.host);
  } catch {
    return false;
  }
};

const optionalAvatarUrlSchema = z
  .string()
  .trim()
  .max(400)
  .optional()
  .refine(
    (value) => {
      if (value === undefined || value.length === 0) return true;
      if (value.startsWith("/")) return true;
      return isAbsoluteUrl(value);
    },
    { message: "avatarUrl must be an absolute URL or a local path" }
  );

export const creatorJobStatusSchema = z.enum(["accepted", "in_progress", "submitted", "approved", "rejected"]);

export const creatorProofSubmissionSchema = z.object({
  videoUrl: z.url().max(400),
  screenshotUrl: z.url().max(400).optional(),
  platform: z.enum(supportedPlatforms).optional(),
  adCode: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional()
});

export const creatorMarketplaceQuerySchema = z.object({
  category: z.enum(["TECH", "FASHION", "FOOD", "BEAUTY", "LIFESTYLE", "EDUCATION"]).optional(),
  campaignStatus: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]).optional().default("ACTIVE"),
  minRewardPoints: z.coerce.number().int().min(0).optional(),
  minPayoutVnd: z.coerce.number().int().min(0).optional(),
  deadlineBefore: z.string().datetime().optional(),
  search: z.string().trim().max(120).optional()
});

export const creatorPayoutRequestSchema = z.object({
  amountVnd: z.number().int().positive(),
  note: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().trim().min(6).max(120)
});

export const creatorProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  avatarUrl: optionalAvatarUrlSchema,
  bio: z.string().trim().max(1000).optional(),
  categories: z.array(z.string().trim().min(1).max(64)).max(20).default([]),
  socialLinks: z.array(z.object({ label: z.string().trim().min(1).max(40), url: z.url().max(400) })).max(10).default([])
});

export const creatorChannelSchema = z.object({
  platform: z.enum(supportedPlatforms),
  url: z.url().max(400),
  followerCount: z.number().int().min(0)
});

export const creatorChannelsUpdateSchema = z.object({
  platform: z.enum(supportedPlatforms),
  url: z.url().max(400),
  followerCount: z.number().int().min(0)
});

export const creatorChannelSetMainSchema = z.object({
  linkId: z.string().trim().min(5).max(191)
});

export type CreatorJobStatus = z.infer<typeof creatorJobStatusSchema>;
export type CreatorChannelsUpdateInput = z.infer<typeof creatorChannelsUpdateSchema>;
export type CreatorProfileUpdateInput = z.infer<typeof creatorProfileUpdateSchema>;
