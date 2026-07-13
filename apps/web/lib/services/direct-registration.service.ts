import { BrandMemberRole, BrandMemberStatus, BrandStatus, NotificationEvent, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/auth/password";
import { createNotification } from "@/lib/services/notification.service";
import type { BrandLink, CreatorLink } from "@/lib/profile-upgrade-form";

type RegisterAccountInput = {
  email: string;
  password: string;
  displayName: string;
};

type CreatorRegistrationInput = RegisterAccountInput & {
  avatarUrl?: string;
  bio?: string;
  contentCategory?: string;
  creatorLinks: CreatorLink[];
};

type BrandRegistrationInput = RegisterAccountInput & {
  brandName: string;
  logoUrl?: string;
  industry: string;
  description?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  brandLinks: BrandLink[];
  legalName?: string;
  taxCode?: string;
  businessLicenseUrl?: string;
  address?: string;
};

function cleanOptional(value?: string) {
  const next = value?.trim();
  return next ? next : null;
}

async function assertEmailAvailable(email: string) {
  const exists = await prisma.account.findUnique({ where: { email }, select: { id: true } });
  if (exists) throw new AppError("Email đã tồn tại", 409, "EMAIL_EXISTS");
}

function toSocialPlatform(platform: CreatorLink["platform"]) {
  return platform.toUpperCase() as "TIKTOK" | "FACEBOOK" | "INSTAGRAM" | "YOUTUBE" | "SHOPEE" | "OTHER";
}

export async function registerCreatorDirect(input: CreatorRegistrationInput) {
  await assertEmailAvailable(input.email);
  const primaryLink = input.creatorLinks[0];
  if (!primaryLink) {
    throw new AppError("Vui lòng thêm ít nhất 1 liên kết mạng xã hội hoặc kênh bán hàng.", 422, "CREATOR_LINK_REQUIRED");
  }

  const result = await prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        email: input.email,
        passwordHash: hashPassword(input.password),
        displayName: input.displayName,
        avatarUrl: cleanOptional(input.avatarUrl),
        role: Role.CREATOR
      }
    });

    await tx.accountRole.createMany({
      data: [
        { accountId: account.id, role: Role.USER },
        { accountId: account.id, role: Role.CREATOR }
      ],
      skipDuplicates: true
    });

    await tx.profile.create({
      data: {
        accountId: account.id,
        bio: cleanOptional(input.bio),
        socialLinks: input.creatorLinks
      }
    });

    await tx.wallet.create({
      data: { userId: account.id }
    });

    const creatorProfile = await tx.creatorProfile.create({
      data: {
        accountId: account.id,
        displayName: input.displayName,
        avatarUrl: cleanOptional(input.avatarUrl),
        bio: cleanOptional(input.bio),
        contentCategory: cleanOptional(input.contentCategory),
        mainPlatform: toSocialPlatform(primaryLink.platform),
        socialUrl: primaryLink.url,
        handle: primaryLink.handle.trim().replace(/^@+/, ""),
        followerCount: primaryLink.followerCount
      }
    });

    await tx.creatorSocialLink.createMany({
      data: input.creatorLinks.map((item) => ({
        creatorProfileId: creatorProfile.id,
        platform: toSocialPlatform(item.platform),
        socialUrl: item.url,
        handle: item.handle.trim().replace(/^@+/, ""),
        followers: item.followerCount,
        isActive: true,
        verificationStatus: "PENDING" as const,
        status: "PENDING" as const
      })),
      skipDuplicates: true
    });

    return { account, creatorProfile };
  });

  await createNotification({
    accountId: result.account.id,
    event: NotificationEvent.CREATOR_PROFILE_CREATED,
    title: "Tạo tài khoản Creator thành công",
    content: "Bạn có thể vào Creator Dashboard và tiếp tục bổ sung xác minh khi cần payout.",
    metadata: { creatorProfileId: result.creatorProfile.id }
  });

  return result;
}

export async function registerBrandDirect(input: BrandRegistrationInput) {
  await assertEmailAvailable(input.email);
  const primaryWebsite = input.brandLinks.find((item) => item.platform === "website")?.url ?? cleanOptional(input.website);

  const result = await prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        email: input.email,
        passwordHash: hashPassword(input.password),
        displayName: input.displayName,
        avatarUrl: cleanOptional(input.logoUrl),
        role: Role.BRAND_OWNER
      }
    });

    await tx.accountRole.createMany({
      data: [
        { accountId: account.id, role: Role.USER },
        { accountId: account.id, role: Role.BRAND_OWNER }
      ],
      skipDuplicates: true
    });

    await tx.profile.create({
      data: {
        accountId: account.id,
        phone: cleanOptional(input.contactPhone),
        bio: cleanOptional(input.description),
        socialLinks: input.brandLinks
      }
    });

    await tx.wallet.create({
      data: { userId: account.id }
    });

    const brand = await tx.brand.create({
      data: {
        ownerAccountId: account.id,
        name: input.brandName,
        logoUrl: cleanOptional(input.logoUrl),
        legalName: cleanOptional(input.legalName),
        industry: input.industry,
        website: primaryWebsite,
        brandLinks: input.brandLinks,
        address: cleanOptional(input.address),
        contactName: cleanOptional(input.contactName) ?? input.displayName,
        contactPhone: cleanOptional(input.contactPhone) ?? "N/A",
        contactEmail: cleanOptional(input.contactEmail) ?? input.email,
        description: cleanOptional(input.description),
        taxCode: cleanOptional(input.taxCode),
        businessLicenseUrl: cleanOptional(input.businessLicenseUrl),
        status: BrandStatus.ACTIVE
      }
    });

    await tx.brandMember.create({
      data: {
        brandId: brand.id,
        accountId: account.id,
        role: BrandMemberRole.OWNER,
        status: BrandMemberStatus.ACTIVE
      }
    });

    return { account, brand };
  });

  await createNotification({
    accountId: result.account.id,
    event: NotificationEvent.BRAND_PROFILE_CREATED,
    title: "Tạo tài khoản Brand thành công",
    content: "Bạn có thể vào Brand Dashboard để quản lý sản phẩm, campaign và làm việc với Creator.",
    metadata: { brandId: result.brand.id }
  });

  return result;
}
