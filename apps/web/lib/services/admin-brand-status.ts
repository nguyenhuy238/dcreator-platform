import { BrandStatus, Prisma } from "@prisma/client";

export const activeBrandWhere = {
  isLocked: false,
  status: BrandStatus.ACTIVE
} satisfies Prisma.BrandWhereInput;
