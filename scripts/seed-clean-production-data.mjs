import {
  CampaignCategory,
  CampaignStatus,
  CampaignType,
  FulfillmentType,
  MissionAudience,
  MissionStatus,
  OpsReviewStatus,
  ProductReceiveOption,
  RewardType,
  PrismaClient
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [admin, brandOwner, creator] = await Promise.all([
    prisma.account.findUniqueOrThrow({ where: { email: "admin@dcreator.vn" } }),
    prisma.account.findUniqueOrThrow({ where: { email: "brand@dcreator.vn" } }),
    prisma.account.findUniqueOrThrow({ where: { email: "creator@dcreator.vn" } })
  ]);

  const brand = await prisma.brand.findUniqueOrThrow({ where: { id: "seed-brand-dcreator" } });

  const products = [
    ["seed-product-1", "NONE Matcha Latte Box", "MATCHA-LATTE-01", 120000, 80],
    ["seed-product-2", "NONE Granola Gift Set", "GRANOLA-GIFT-01", 180000, 60],
    ["seed-product-3", "NONE Skincare Trial Kit", "SKINCARE-TRIAL-01", 220000, 40],
    ["seed-product-4", "NONE Lifestyle Voucher", "LIFESTYLE-VOUCHER-01", 150000, 100]
  ];

  for (const [id, name, sku, priceVnd, stock] of products) {
    const product = await prisma.brandProduct.upsert({
      where: { id },
      update: {
        brandId: brand.id,
        sku,
        name,
        stockQty: stock,
        voucherStock: stock,
        campaignEligibility: true,
        suggestedPriceVnd: priceVnd,
        priceVnd,
        pricePoints: priceVnd,
        imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200"
      },
      create: {
        id,
        brandId: brand.id,
        sku,
        name,
        description: `${name} seed sạch cho campaign đầu tiên.`,
        stockQty: stock,
        voucherStock: stock,
        campaignEligibility: true,
        suggestedPriceVnd: priceVnd,
        costPriceVnd: Math.round(priceVnd * 0.55),
        priceVnd,
        pricePoints: priceVnd,
        imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200",
        returnPolicy: "Đổi trả theo chính sách NONE Station."
      }
    });

    await prisma.brandInventoryBatch.upsert({
      where: { id: `${id}-batch-1` },
      update: {
        productId: product.id,
        quantity: stock,
        fulfillmentType: FulfillmentType.BRAND_FULFILLMENT,
        opsStatus: OpsReviewStatus.APPROVED,
        appraisedValueVnd: priceVnd * stock,
        viableMarginPercent: 35
      },
      create: {
        id: `${id}-batch-1`,
        productId: product.id,
        quantity: stock,
        fulfillmentType: FulfillmentType.BRAND_FULFILLMENT,
        opsStatus: OpsReviewStatus.APPROVED,
        appraisedValueVnd: priceVnd * stock,
        viableMarginPercent: 35,
        opsNote: "Seed inventory sạch sau reset deploy."
      }
    });
  }

  const activeCampaign = await prisma.campaign.upsert({
    where: { slug: "clean-launch-campaign" },
    update: {
      brandId: brandOwner.id,
      creatorId: creator.id,
      title: "NONE Clean Launch Campaign",
      brief: "Campaign sạch để kiểm tra flow Ủng Hộ, reward và mission sau reset.",
      status: CampaignStatus.ACTIVE,
      isPublic: true,
      startsAt: new Date(Date.now() - 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    create: {
      brandId: brandOwner.id,
      creatorId: creator.id,
      slug: "clean-launch-campaign",
      title: "NONE Clean Launch Campaign",
      brief: "Campaign sạch để kiểm tra flow Ủng Hộ, reward và mission sau reset.",
      coverImageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400",
      campaignType: CampaignType.COMMUNITY,
      category: CampaignCategory.LIFESTYLE,
      objective: "Khởi động dữ liệu thật sau reset deploy.",
      priorityChannels: "TikTok, Facebook, None Station",
      missionTypes: "Video review, post ảnh, check-in tại station",
      creatorCommissionPercent: 12,
      userCommissionPercent: 5,
      bonusBudgetVnd: 5_000_000,
      targetAmountVnd: 30_000_000,
      fundedAmountVnd: 0,
      budgetVnd: 30_000_000,
      status: CampaignStatus.ACTIVE,
      isPublic: true,
      startsAt: new Date(Date.now() - 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.reward.upsert({
    where: { id: "clean-launch-reward-1" },
    update: {
      campaignId: activeCampaign.id,
      title: "Voucher trải nghiệm NONE",
      pointsCost: 50_000,
      stockTotal: 100,
      stockRemaining: 100,
      isActive: true
    },
    create: {
      id: "clean-launch-reward-1",
      campaignId: activeCampaign.id,
      title: "Voucher trải nghiệm NONE",
      description: "Voucher dùng thử sản phẩm tại None Station.",
      rewardType: RewardType.DIGITAL_VOUCHER,
      pointsCost: 50_000,
      stockTotal: 100,
      stockRemaining: 100,
      isActive: true,
      estimatedDeliveryAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.mission.upsert({
    where: { id: "clean-launch-mission-1" },
    update: {
      campaignId: activeCampaign.id,
      title: "Đăng video review 9:16",
      productName: "NONE Matcha Latte Box",
      productDescription: "Sản phẩm seed sạch dùng cho nhiệm vụ creator review.",
      productImageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200",
      productLink: "https://dcreator.vn/campaigns/clean-launch-campaign",
      rewardPoints: 20_000,
      status: MissionStatus.OPEN
    },
    create: {
      id: "clean-launch-mission-1",
      campaignId: activeCampaign.id,
      title: "Đăng video review 9:16",
      description: "Creator quay video review chân thực, dùng CTA Ủng Hộ và Đổi Quà.",
      productName: "NONE Matcha Latte Box",
      productDescription: "Sản phẩm seed sạch dùng cho nhiệm vụ creator review.",
      productImageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200",
      productLink: "https://dcreator.vn/campaigns/clean-launch-campaign",
      rewardPoints: 20_000,
      rewardCommissionVnd: 100_000,
      audience: MissionAudience.CREATOR,
      productReceiveOption: ProductReceiveOption.PRODUCT_REQUIRED,
      status: MissionStatus.OPEN,
      deadlineAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.campaign.upsert({
    where: { slug: "clean-draft-campaign" },
    update: {
      brandId: brandOwner.id,
      creatorId: null,
      title: "NONE Draft Campaign",
      status: CampaignStatus.DRAFT,
      isPublic: false
    },
    create: {
      brandId: brandOwner.id,
      creatorId: null,
      slug: "clean-draft-campaign",
      title: "NONE Draft Campaign",
      brief: "Campaign draft sạch để admin/brand kiểm tra quy trình duyệt.",
      campaignType: CampaignType.COMMUNITY,
      category: CampaignCategory.FOOD,
      targetAmountVnd: 20_000_000,
      fundedAmountVnd: 0,
      budgetVnd: 20_000_000,
      status: CampaignStatus.DRAFT,
      isPublic: false
    }
  });

  await prisma.adminSetting.upsert({
    where: { scope: "global" },
    update: {},
    create: { scope: "global" }
  });

  console.log("Clean deploy data ready:");
  console.log("- active campaign: clean-launch-campaign");
  console.log("- draft campaign: clean-draft-campaign");
  console.log("- products: 4");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
