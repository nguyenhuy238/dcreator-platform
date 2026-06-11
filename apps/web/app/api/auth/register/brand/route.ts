import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api-response";
import { CURRENT_BRAND_COOKIE } from "@/lib/auth/brand-context";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { AppError, toErrorResponse } from "@/lib/errors";
import { BRAND_LINK_PLATFORMS, normalizeBrandLinks } from "@/lib/profile-upgrade-form";
import { registerBrandDirect } from "@/lib/services/direct-registration.service";
import { saveUpload } from "@/lib/storage/upload";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const ALLOWED_LICENSE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp"
];

const payloadSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(64),
  displayName: z.string().trim().min(2).max(80),
  brandName: z.string().trim().min(2).max(160),
  industry: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  contactName: z.string().trim().max(160).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  contactEmail: z.email().trim().toLowerCase().optional().or(z.literal("")),
  website: z.string().trim().max(400).optional().or(z.literal("")),
  brandLinks: z.array(z.object({
    platform: z.enum(BRAND_LINK_PLATFORMS),
    url: z.string().trim().max(400)
  })).max(20).default([]),
  legalName: z.string().trim().max(160).optional(),
  taxCode: z.string().trim().max(60).optional(),
  address: z.string().trim().max(240).optional()
}).superRefine((value, ctx) => {
  if (value.contactPhone && !/^(0|\+84)[0-9\s.-]{8,14}$/.test(value.contactPhone)) {
    ctx.addIssue({ code: "custom", path: ["contactPhone"], message: "Số điện thoại Việt Nam không hợp lệ." });
  }
  if (value.taxCode && !/^[0-9]{8,14}$/.test(value.taxCode)) {
    ctx.addIssue({ code: "custom", path: ["taxCode"], message: "Mã số thuế chỉ gồm số, độ dài 8-14 ký tự." });
  }
});

function parseJsonField(formData: FormData) {
  const raw = formData.get("payload");
  if (typeof raw !== "string") throw new AppError("Thiếu dữ liệu đăng ký Brand", 422, "PAYLOAD_REQUIRED");
  return payloadSchema.parse(JSON.parse(raw));
}

function getOptionalFile(formData: FormData, field: string, allowedTypes: string[], label: string) {
  const value = formData.get(field);
  if (!(value instanceof File) || value.size === 0) return null;
  if (!allowedTypes.includes(value.type)) throw new AppError(`${label} không đúng định dạng`, 422, "INVALID_FILE_TYPE");
  if (value.size > MAX_FILE_SIZE) throw new AppError(`${label} vượt quá 5MB`, 422, "FILE_TOO_LARGE");
  return value;
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const formData = await request.formData();
    const payload = parseJsonField(formData);
    const brandLinks = normalizeBrandLinks(payload.brandLinks);
    const logo = getOptionalFile(formData, "logo", ALLOWED_LOGO_TYPES, "Logo Brand");
    const businessLicense = getOptionalFile(formData, "businessLicense", ALLOWED_LICENSE_TYPES, "Giấy phép kinh doanh");
    const logoUrl = logo
      ? await saveUpload({
          file: logo,
          folder: "brand-logo",
          suffix: "brand-register-logo",
          ext: logo.type.split("/")[1] || "png"
        })
      : "";
    const businessLicenseUrl = businessLicense
      ? await saveUpload({
          file: businessLicense,
          folder: "brand-kyc",
          suffix: "brand-register-license"
        })
      : "";

    const { account, brand } = await registerBrandDirect({
      ...payload,
      logoUrl,
      businessLicenseUrl,
      brandLinks
    });
    const sessionToken = await createSession(account.id, Role.BRAND_OWNER);
    await setSessionCookie(sessionToken);

    const response = ok({
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      role: Role.BRAND_OWNER,
      roles: [Role.USER, Role.BRAND_OWNER],
      brand: { id: brand.id, name: brand.name, status: brand.status }
    }, 201);
    response.cookies.set(CURRENT_BRAND_COOKIE, brand.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
