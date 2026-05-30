"use client";

import Link from "next/link";
import { PageHeader, SectionHeader } from "@/app/components/dcreator/ui/base";

const settingsItems = [
  {
    href: "/dashboard/brand/profile",
    title: "Hồ sơ nhãn hàng",
    description: "Cập nhật tên Brand, thông tin liên hệ, logo và trạng thái xác minh."
  },
  {
    href: "/dashboard/brand/wallet",
    title: "Ví N-Point",
    description: "Theo dõi số dư N-Point, gửi yêu cầu nạp điểm và thông tin hoàn tiền."
  }
] as const;

export default function BrandSettingsPage() {
  return (
    <>
      <PageHeader title="Cài đặt Brand" subtitle="Quản lý hồ sơ nhãn hàng, ví N-Point và thiết lập vận hành Brand." />

      <section className="mt-6">
        <SectionHeader title="Thiết lập chính" />
        <div className="grid gap-4 md:grid-cols-2">
          {settingsItems.map((item) => (
            <Link key={item.href} href={item.href} className="dc-card block p-5 transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-base font-bold text-zinc-900">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{item.description}</p>
              <span className="mt-4 inline-flex rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">Mở cài đặt</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <article className="dc-card p-5">
          <SectionHeader title="Vận hành Brand" subtitle="Policy nội dung, giới hạn budget và luồng duyệt nội bộ sẽ được cấu hình tại đây." />
          <p className="text-sm leading-6 text-zinc-600">
            Các cấu hình vận hành nâng cao đang được gom về một nơi để Brand dễ quản lý sau khi hoàn tất hồ sơ và ví N-Point.
          </p>
        </article>
      </section>
    </>
  );
}
