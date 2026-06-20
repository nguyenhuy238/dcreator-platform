import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { AppError, toErrorResponse } from "@/lib/errors";
import { normalizeCreatorLinks } from "@/lib/profile-upgrade-form";
import { registerCreatorDirect } from "@/lib/services/direct-registration.service";
import { saveUpload } from "@/lib/storage/upload";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const payloadSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(64),
  displayName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(2000).optional(),
  contentCategory: z.string().trim().max(120).optional(),
  creatorLinks: z.array(z.object({
    platform: z.enum(["tiktok", "facebook", "instagram", "youtube", "shopee", "other"]),
    url: z.string().trim().min(1).max(400),
    handle: z.string().trim().min(1).max(120),
    followerCount: z.number().int().min(0)
  })).min(1).max(20)
});

function parseJsonField(formData: FormData) {
  const raw = formData.get("payload");
  if (typeof raw !== "string") throw new AppError("Thiếu dữ liệu đăng ký Creator", 422, "PAYLOAD_REQUIRED");
  return payloadSchema.parse(JSON.parse(raw));
}

function getOptionalImage(formData: FormData, field: string) {
  const value = formData.get(field);
  if (!(value instanceof File) || value.size === 0) return null;
  if (!value.type.startsWith("image/")) throw new AppError("Avatar Creator phải là file ảnh", 422, "INVALID_FILE_TYPE");
  if (value.size > MAX_IMAGE_SIZE) throw new AppError("Avatar Creator vượt quá 5MB", 422, "FILE_TOO_LARGE");
  return value;
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const formData = await request.formData();
    const payload = parseJsonField(formData);
    const creatorLinks = normalizeCreatorLinks(payload.creatorLinks);
    const avatar = getOptionalImage(formData, "avatar");
    const avatarUrl = avatar
      ? await saveUpload({
          file: avatar,
          folder: "creator-avatar",
          suffix: "creator-register-avatar",
          ext: avatar.type.split("/")[1] || "jpg"
        })
      : "";

    const { account, creatorProfile } = await registerCreatorDirect({
      ...payload,
      avatarUrl,
      creatorLinks
    });
    const sessionToken = await createSession(account.id, Role.CREATOR);
    await setSessionCookie(sessionToken);

    return ok({
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      role: Role.CREATOR,
      roles: [Role.USER, Role.CREATOR],
      creatorProfileId: creatorProfile.id
    }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
