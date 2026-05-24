import { z } from "zod";

export const updateUserSettingsSchema = z.object({
  currentPassword: z.string().min(8).max(64).optional(),
  newPassword: z.string().min(8).max(64).optional(),
  notifyReviewStatusEmail: z.boolean(),
  notifyVoucherMissionEmail: z.boolean()
}).superRefine((value, ctx) => {
  const hasCurrent = Boolean(value.currentPassword);
  const hasNext = Boolean(value.newPassword);
  if (hasCurrent !== hasNext) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cần nhập đủ mật khẩu hiện tại và mật khẩu mới để đổi mật khẩu.",
      path: hasCurrent ? ["newPassword"] : ["currentPassword"]
    });
  }
});

