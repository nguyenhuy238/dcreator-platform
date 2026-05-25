"use client";

import { PageHeader } from "@/app/components/dcreator/ui/base";

type PackageItem = {
  name: string;
  price: string;
  summary: string;
  features: string[];
  specialTitle?: string;
  specialIntro?: string;
  specialFeatures?: string[];
  fitTitle?: string;
  fitFeatures?: string[];
};

const packages: PackageItem[] = [
  {
    name: "Gói Free",
    price: "0đ",
    summary: "Khởi động, test hiệu quả creator marketing với chi phí thấp.",
    features: [],
    specialTitle: "ĐẶC BIỆT",
    specialIntro: "25 Brands đầu tiên sẽ được:",
    specialFeatures: [
      "Tặng miễn phí 20 video UGC / Brand",
      "Tổng chương trình hỗ trợ lên đến 500 video",
      "Creator phù hợp theo ngành hàng & sản phẩm",
      "Nội dung tối ưu TikTok Shop & Social Commerce"
    ]
  },
  {
    name: "UGC - Gói 15 Video",
    price: "5.000.000đ",
    summary: "15 video review sản phẩm/dịch vụ với creator trên hệ thống.",
    features: [
      "Creator đăng ký tham gia và được lọc theo tiêu chí Brand",
      "Mỗi video là nội dung UGC theo brief campaign",
      "Brand có thể dùng lại cho fanpage, website, ads"
    ]
  },
  {
    name: "UGC - Gói 50 Video",
    price: "12.000.000đ",
    summary: "Gói mở rộng cho chiến dịch phủ rộng nội dung UGC.",
    features: [
      "Bao gồm 50 video UGC cho sản phẩm/dịch vụ",
      "Có thể kết hợp hàng/tiền hàng/voucher theo campaign",
      "Phù hợp mục tiêu scale nhận diện và chuyển đổi"
    ]
  }
];

export default function BrandSubscriptionsPage() {
  return (
    <>
      <PageHeader
        title="Mục tiêu gói đăng ký"
        subtitle="Chọn gói phù hợp cho mục tiêu campaign của Brand. Tính năng nâng cấp sẽ mở trong bước tiếp theo."
      />
      <section className="grid gap-4 md:grid-cols-3">
        {packages.map((item) => (
          <article key={item.name} className="dc-card flex h-full flex-col p-5">
            <h2 className="text-lg font-semibold text-zinc-900">{item.name}</h2>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{item.price}</p>
            <p className="mt-3 text-sm text-zinc-600">{item.summary}</p>

            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              {item.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>

            {item.specialTitle ? (
              <div className="mt-5 text-sm text-zinc-700">
                <p className="font-semibold text-zinc-900">🎁 {item.specialTitle}:</p>
                <p className="mt-2">{item.specialIntro}</p>
                <ul className="mt-2 space-y-2">
                  {item.specialFeatures?.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {item.fitTitle ? (
              <div className="mt-5 text-sm text-zinc-700">
                <p className="font-semibold text-zinc-900">{item.fitTitle}</p>
                <ul className="mt-2 space-y-2">
                  {item.fitFeatures?.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <button
              type="button"
              disabled
              className="mt-5 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white opacity-60"
            >
              Sắp mở nâng cấp
            </button>
          </article>
        ))}
      </section>
    </>
  );
}

