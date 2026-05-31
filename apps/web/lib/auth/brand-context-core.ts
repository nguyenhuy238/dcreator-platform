import { AppError } from "../errors-core.ts";

export type BrandContextMembership = { id: string };

export function resolveCurrentBrandIdFromMemberships(input: {
  brandMemberships: BrandContextMembership[];
  activeBrandId?: string | null;
  preferredBrandId?: string | null;
}) {
  if (input.brandMemberships.length === 0) {
    throw new AppError("Bạn chưa thuộc Brand nào. Vui lòng tạo Brand mới.", 403, "BRAND_MEMBERSHIP_REQUIRED");
  }

  if (input.preferredBrandId) {
    const canAccess = input.brandMemberships.some((membership) => membership.id === input.preferredBrandId);
    if (!canAccess) {
      throw new AppError("Bạn không có quyền truy cập Brand này.", 403, "BRAND_FORBIDDEN");
    }
    return input.preferredBrandId;
  }

  return input.activeBrandId ?? input.brandMemberships[0]!.id;
}
