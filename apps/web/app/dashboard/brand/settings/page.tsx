import Link from "next/link";
import { Coins, IdentificationCard, Storefront } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/app/components/dcreator/ui/base";
import { AddBrandForm } from "@/app/dashboard/brand/_components/AddBrandForm";
import { EmbeddedRoleUpgradePanels } from "@/app/dashboard/user/_components/EmbeddedRoleUpgradePanels";
import { SettingsAccordion } from "@/app/dashboard/user/_components/SettingsAccordion";

const settingsItems = [
  {
    href: "/dashboard/brand/wallet",
    title: "Ví N-Point",
    description: "Theo dõi số dư N-Point và xử lý yêu cầu nạp hoặc hoàn tiền.",
    icon: Coins
  },
  {
    href: "/dashboard/brand/onboarding",
    title: "Onboarding / BCC",
    description: "Hoàn tất hồ sơ pháp lý, thông tin vận hành và hợp đồng BCC.",
    icon: IdentificationCard
  },
  {
    href: "/dashboard/brand/profile",
    title: "Hồ sơ nhãn hàng",
    description: "Cập nhật thông tin hiển thị, liên hệ và trạng thái xác minh của Brand.",
    icon: Storefront
  }
] as const;

export default function BrandSettingsPage() {
  return (
    <>
      <PageHeader title="Cài đặt Brand" subtitle="Quản lý ví, onboarding và hồ sơ nhãn hàng tại một nơi." />
      <section className="grid gap-4 md:grid-cols-3">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="dc-card group flex h-full flex-col p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <Icon size={28} weight="duotone" className="text-zinc-700" />
              <h2 className="mt-4 text-lg font-bold text-zinc-900">{item.title}</h2>
              <p className="mt-2 text-sm text-zinc-600">{item.description}</p>
              <span className="mt-5 text-sm font-semibold text-zinc-900 group-hover:underline">Mở cài đặt</span>
            </Link>
          );
        })}
      </section>
      <div className="mt-6 space-y-4">
        <SettingsAccordion
          title="Thêm thương hiệu khác"
          description="Tạo thêm Brand thuộc tài khoản hiện tại và chuyển nhanh giữa các workspace Brand."
        >
          <AddBrandForm />
        </SettingsAccordion>
        <EmbeddedRoleUpgradePanels targets={["creator"]} />
      </div>
    </>
  );
}
