import Link from "next/link";
import { CampaignStatus } from "@prisma/client";
import { FeaturedCampaignsSection } from "@/app/components/dcreator/home/FeaturedCampaignsSection";
import { PublicFooter, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { listCampaigns } from "@/lib/services/campaign.service";

function formatRatio(value: number) {
  return `${value.toFixed(2)}x`;
}

export default async function BrandHomePage() {
  const [campaignData, currentUser] = await Promise.all([
    listCampaigns({
      sort: "trending",
      page: 1,
      limit: 24,
      status: CampaignStatus.ACTIVE
    }),
    getCurrentUserFromServer()
  ]);

  const roles = currentUser?.roles ?? [];
  const hasBrandRole = roles.includes("BRAND_OWNER") || roles.includes("BRAND_STAFF");

  const activeCampaignCount = campaignData.pagination.total;
  const totalApplicants = campaignData.items.reduce((sum, item) => sum + Math.max(0, item.creatorApplicants ?? 0), 0);
  const totalRewardsLeft = campaignData.items.reduce((sum, item) => sum + Math.max(0, item.rewardsLeft ?? 0), 0);

  const fundedRatioSamples = campaignData.items
    .filter((item) => item.targetAmount > 0)
    .map((item) => item.fundedAmount / item.targetAmount);
  const averageFundedRatio =
    fundedRatioSamples.length > 0
      ? fundedRatioSamples.reduce((sum, value) => sum + value, 0) / fundedRatioSamples.length
      : 0;

  const primaryCtaHref = hasBrandRole ? "/dashboard/brand/campaigns" : "/brand/register";
  const primaryCtaLabel = hasBrandRole ? "Vào Brand Dashboard" : "Đăng ký Brand";

  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 pb-24 pt-5 md:px-6">
        <section className="rounded-[2.2rem] bg-gradient-to-b from-zinc-100 via-zinc-50/60 to-white px-4 py-8 md:py-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex rounded-full bg-zinc-200/70 px-4 py-1 text-sm font-bold uppercase tracking-[0.12em] text-zinc-700">
              Brand Home
            </p>
            <h1 className="mt-4 text-3xl font-black leading-tight text-zinc-900 md:text-5xl">
              Scale doanh thu bằng Creator Network và campaign minh bạch
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-zinc-500 md:text-lg">
              Xem nhu cầu Creator theo campaign, theo dõi hiệu suất tài trợ và quản trị reward stock theo thời gian thực.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href={primaryCtaHref} className="dc-btn-primary min-w-[220px] rounded-full px-6 text-base font-bold">
                {primaryCtaLabel}
              </Link>
              <Link href="/campaigns" className="dc-btn-secondary min-w-[220px] rounded-full px-6 text-base font-semibold">
                Xem campaign đang hoạt động
              </Link>
            </div>
          </div>

          <div className="mt-7 grid overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50/80 md:grid-cols-4">
            <article className="px-4 py-4 text-center md:border-r md:border-zinc-200">
              <p className="text-3xl font-black text-zinc-900 md:text-4xl">{activeCampaignCount}</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Campaign active</p>
            </article>
            <article className="px-4 py-4 text-center md:border-r md:border-zinc-200">
              <p className="text-3xl font-black text-zinc-900 md:text-4xl">{formatRatio(averageFundedRatio)}</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Tỉ lệ tài trợ TB</p>
            </article>
            <article className="px-4 py-4 text-center md:border-r md:border-zinc-200">
              <p className="text-3xl font-black text-zinc-900 md:text-4xl">{totalApplicants}</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Creator ứng tuyển</p>
            </article>
            <article className="px-4 py-4 text-center">
              <p className="text-3xl font-black text-zinc-900 md:text-4xl">{totalRewardsLeft}</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Reward còn lại</p>
            </article>
          </div>
        </section>

        <FeaturedCampaignsSection campaigns={campaignData.items.slice(0, 12)} />

        <section className="mt-10 rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Inventory as Capital</p>
              <h2 className="mt-2 text-xl font-black text-zinc-900">Nạp hàng tồn làm vốn</h2>
              <p className="mt-2 text-sm text-zinc-600">Thiết lập reward stock theo chiến dịch, giữ dòng tiền linh hoạt mà vẫn tối ưu tồn kho.</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Creator Engine</p>
              <h2 className="mt-2 text-xl font-black text-zinc-900">Kích hoạt mạng lưới Creator</h2>
              <p className="mt-2 text-sm text-zinc-600">Mở nhiệm vụ rõ ràng, thu hút đúng creator niche và tăng tốc độ lan tỏa nội dung.</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Growth Loop</p>
              <h2 className="mt-2 text-xl font-black text-zinc-900">Đo lường và tái đầu tư</h2>
              <p className="mt-2 text-sm text-zinc-600">Theo dõi kết quả thực tế theo campaign để tối ưu commission, ngân sách và vòng lặp tăng trưởng.</p>
            </article>
          </div>
        </section>

        <section className="mt-10 overflow-hidden rounded-[2rem] border border-zinc-900 bg-zinc-900 text-white">
          <div className="p-6 md:p-8 lg:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Brand Checklist</p>
            <h2 className="mt-2 text-2xl font-black md:text-3xl">Sẵn sàng setup campaign mới trong vài bước</h2>
            <p className="mt-3 max-w-3xl text-sm text-zinc-300 md:text-base">
              Điền brief sản phẩm, phân bổ reward, mở mission video và để hệ thống dCreator vận hành vòng lặp Creator - Fan - Voucher.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/brand/campaign-setup" className="dc-btn-primary bg-white text-zinc-900 hover:bg-zinc-100">
                Tạo campaign mới
              </Link>
              <Link href="/dashboard/brand/analytics" className="dc-btn-secondary border-white/20 bg-zinc-900 text-white hover:bg-zinc-800">
                Xem báo cáo tăng trưởng
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
