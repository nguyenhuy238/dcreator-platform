import Link from "next/link";
import Image from "next/image";
import { ExploreCampaignsButton } from "@/app/components/dcreator/home/ExploreCampaignsButton";
import { FeaturedCampaignsSection } from "@/app/components/dcreator/home/FeaturedCampaignsSection";
import { HomepageSectionButton } from "@/app/components/dcreator/home/HomepageSectionButton";
import { PartnerLogo } from "@/app/components/dcreator/home/PartnerLogo";
import { PublicFooter, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { deriveCapabilities } from "@/lib/auth/capabilities";
import { listCampaigns } from "@/lib/services/campaign.service";

const faqs = [
  {
    q: "dCreator phù hợp với ai?",
    a: "Phù hợp với Creator muốn kiếm thêm thu nhập và Brand/SME muốn tăng doanh thu qua social commerce."
  },
  {
    q: "Creator có cần nhiều follower mới tham gia được không?",
    a: "Không bắt buộc quá lớn, quan trọng là phù hợp tiêu chí campaign và chất lượng nội dung."
  },
  {
    q: "dCreator khác gì so với thuê KOL/KOC truyền thống?",
    a: "dCreator giúp doanh nghiệp tiếp cận mạng lưới Creator đa dạng, quản lý campaign tập trung và theo dõi hiệu quả trên một nền tảng duy nhất."
  },
  {
    q: "Tôi mới bắt đầu làm nội dung có tham gia được không?",
    a: "Có. dCreator ưu tiên sự phù hợp với sản phẩm và chất lượng nội dung hơn là số lượng follower."
  },
  {
    q: "Tôi có thể tham gia nhiều campaign cùng lúc không?",
    a: "Có, miễn là bạn đáp ứng yêu cầu của từng chiến dịch và đảm bảo tiến độ thực hiện."
  },
  {
    q: "Tôi có thể trở thành Creator từ người dùng thông thường không?",
    a: "Có. dCreator khuyến khích người dùng tham gia sáng tạo nội dung và phát triển thành Micro Creator."
  },
  {
    q: "Vì sao dCreator tin rằng nội dung có thể tạo ra doanh thu?",
    a: "Vì mỗi nội dung chất lượng không chỉ tạo lượt xem, mà còn xây dựng niềm tin — yếu tố quan trọng nhất dẫn đến quyết định mua hàng."
  }
];

export default async function HomePage() {
  const [featuredCampaigns, campaignStatsSource, currentUser] = await Promise.all([
    listCampaigns({
      sort: "trending",
      page: 1,
      limit: 12,
      status: "ACTIVE"
    }),
    listCampaigns({
      sort: "trending",
      page: 1,
      limit: 24,
      status: "ACTIVE"
    }),
    getCurrentUserFromServer()
  ]);
  const roles = currentUser?.roles ?? [];
  const isLoggedIn = Boolean(currentUser);
  const capabilities = currentUser
    ? deriveCapabilities({
        roles,
        creatorProfile: currentUser.creatorProfile,
        brandMemberships: currentUser.brandMemberships
      })
    : null;
  const hasCreatorRole = Boolean(capabilities?.creator);
  const hasBrandRole = Boolean(capabilities?.brand);
  const canUpgradeRole = isLoggedIn && (!hasCreatorRole || !hasBrandRole);

  const activeCampaignCount = campaignStatsSource.pagination.total;
  const participants = new Set<string>();
  for (const item of campaignStatsSource.items) {
    if (item.brand) participants.add(`brand:${item.brand}`);
    if (item.creator) participants.add(`creator:${item.creator}`);
  }
  const totalParticipants = participants.size;
  const fundedRatioSamples = campaignStatsSource.items
    .filter((item) => item.targetAmount > 0)
    .map((item) => item.fundedAmount / item.targetAmount);
  const averageFundedRatio =
    fundedRatioSamples.length > 0
      ? fundedRatioSamples.reduce((sum, ratio) => sum + ratio, 0) / fundedRatioSamples.length
      : 0;
  const averageFundedRatioDisplay = `${averageFundedRatio.toFixed(2)}x`;
  const brandMap = new Map<string, { name: string; logoUrl: string | null }>();
  for (const item of campaignStatsSource.items) {
    const brandName = item.brand?.trim();
    if (!brandName) continue;
    if (!brandMap.has(brandName)) {
      brandMap.set(brandName, {
        name: brandName,
        logoUrl: item.brandLogoUrl ?? null
      });
      continue;
    }
    const current = brandMap.get(brandName);
    if (current && !current.logoUrl && item.brandLogoUrl) {
      brandMap.set(brandName, { ...current, logoUrl: item.brandLogoUrl });
    }
  }
  const partneredBrands = Array.from(brandMap.values()).slice(0, 12);
  return (
    <>
      <PublicHeader
        hideRoleSwitch
        audienceToggles={[
          { href: "/creator", label: "Dành cho Creator" },
          { href: "/brand", label: "Dành cho Brand" }
        ]}
      />
      <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 pb-16 pt-5 md:px-6">
        <section className="rounded-[2.2rem] bg-gradient-to-b from-zinc-100 via-zinc-50/50 to-white px-4 py-8 md:py-10">
          <div className="mx-auto max-w-2xl text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-zinc-200/70 px-4 py-1 text-sm font-bold uppercase tracking-[0.1em] text-zinc-700">#Dividends</span>
              <span className="rounded-full bg-zinc-200/70 px-4 py-1 text-sm font-bold uppercase tracking-[0.1em] text-zinc-700">#Domination</span>
              <span className="rounded-full bg-zinc-200/70 px-4 py-1 text-sm font-bold uppercase tracking-[0.1em] text-zinc-700">#Dedicated</span>
            </div>
            <p className="font-display mt-4 bg-gradient-to-b from-zinc-950 to-zinc-700 bg-clip-text text-[44px] font-black leading-none tracking-[-0.05em] text-transparent md:text-[72px] lg:text-[86px]">dCREATOR</p>
            <p className="mt-1 text-4xl font-medium italic leading-none text-zinc-400 [font-family:Georgia,'Times_New_Roman',serif] md:text-6xl">Platform</p>
            <h1 className="mt-5 text-xl font-semibold leading-tight text-zinc-500 md:text-3xl">
              Giao điểm của <span className="font-black text-zinc-900">Sáng tạo</span> và <span className="font-black text-zinc-900">Vốn</span>.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base text-zinc-500 md:text-xl">
              Lan tỏa giá trị, giảm áp lực tài chính.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:mt-7">
              <ExploreCampaignsButton />
              {!isLoggedIn ? (
                <Link href="/auth/register" className="dc-btn-secondary h-10 min-w-[190px] rounded-full px-6 text-base font-semibold">
                  Tạo tài khoản
                </Link>
              ) : null}
              {canUpgradeRole ? (
                <Link href="/dashboard/user/upgrade" className="dc-btn-secondary h-10 min-w-[190px] rounded-full px-6 text-base font-semibold">
                  Nâng cấp vai trò
                </Link>
              ) : null}
            </div>

            <div className="mt-6 grid overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50/70 md:mt-7 md:grid-cols-3">
              <article className="px-4 py-4 text-center md:border-r md:border-zinc-200">
                <p className="text-3xl font-black text-zinc-900 md:text-4xl">{activeCampaignCount}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Dự án đang chạy</p>
              </article>
              <article className="px-4 py-4 text-center md:border-r md:border-zinc-200">
                <p className="text-3xl font-black text-zinc-900 md:text-4xl">{averageFundedRatioDisplay}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Tỷ lệ tài trợ trung bình</p>
              </article>
              <article className="px-4 py-4 text-center">
                <p className="text-3xl font-black text-zinc-900 md:text-4xl">{totalParticipants}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">Người tham gia</p>
              </article>
            </div>
          </div>
        </section>

        <FeaturedCampaignsSection campaigns={featuredCampaigns.items} />

        <section className="relative mt-10 overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6 text-white shadow-[0_25px_60px_-25px_rgba(0,0,0,0.8)] md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-cyan-400/10 blur-3xl" />
          <p className="inline-flex rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-200 backdrop-blur">Sứ mệnh</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black leading-[1.15] text-white md:text-4xl">Sứ mệnh của dCreator</h2>
          <div className="mt-5 max-w-3xl space-y-5 text-base leading-7 text-zinc-200 md:text-lg md:leading-8">
            <p>
              Biến nội dung thành doanh thu thực tế và chia sẻ giá trị cho tất cả những người tạo ra giá trị trong hệ sinh thái.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-200 bg-white px-4 py-5 md:px-6 md:py-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">The Flywheel Engine</p>
            <h2 className="mt-2 text-2xl font-black leading-[0.95] text-zinc-900 md:text-4xl">Win-Win-Win Flywheel</h2>
            <p className="mx-auto mt-2 max-w-2xl text-base leading-tight text-zinc-600 md:text-lg">
              Dòng chảy giá trị khép kín giữa Thương hiệu, Creator và Người tiêu dùng.
              <br />
              Công bằng, minh bạch và cộng sinh.
            </p>
          </div>

          <div className="mx-auto mt-6 max-w-3xl text-center">
            <p className="text-lg font-black uppercase tracking-[0.16em] text-zinc-900 md:text-xl">BRAND</p>
            <p className="mt-2 text-sm font-bold text-zinc-400 md:text-base">Inventory &amp; Margin</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-700 md:text-lg">
              Tăng doanh thu bằng UGC hiệu quả và tối ưu chi phí marketing.
            </p>
          </div>

          <div className="relative mx-auto mt-5 h-[260px] w-full max-w-[460px] md:h-[320px]">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[84%] w-[84%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-sky-100/35 via-transparent to-emerald-100/30 blur-2xl" />
            <div className="flywheel-pulse absolute left-1/2 top-1/2 h-[86%] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-zinc-300/70" />
            <div className="absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-300/65" />
            <div className="absolute left-1/2 top-1/2 h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-300/55" />
            <div className="absolute left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-300/45" />

            <svg
              viewBox="0 0 100 100"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2"
              aria-hidden="true"
            >
              <polygon
                points="50,15 17,74 83,74"
                fill="none"
                stroke="rgb(212 212 216 / 0.75)"
                strokeWidth="1.1"
                strokeLinejoin="round"
                strokeDasharray="3 2"
                className="animate-[dash_6s_linear_infinite]"
              />
            </svg>

            <div className="flywheel-fade absolute left-1/2 top-[14%] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm animate-[floatY_3.6s_ease-in-out_infinite]">
              <span className="text-2xl">🏢</span>
            </div>
            <div className="flywheel-fade absolute left-[22%] top-[78%] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm animate-[floatY_4.1s_ease-in-out_infinite] [animation-delay:160ms]">
              <span className="text-2xl">👥</span>
            </div>
            <div className="flywheel-fade absolute right-[22%] top-[78%] flex h-12 w-12 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm animate-[floatY_3.8s_ease-in-out_infinite] [animation-delay:320ms]">
              <span className="text-2xl">📷</span>
            </div>

            <div className="flywheel-fade absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white [animation-delay:120ms]">
              <div className="absolute inset-0 rounded-full bg-zinc-900/15 blur-md animate-pulse" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-2xl font-black text-white">d</div>
            </div>
          </div>

          <div className="mx-auto mt-0 grid max-w-3xl gap-4 text-center md:grid-cols-2">
            <article>
              <p className="text-lg font-black uppercase tracking-[0.16em] text-zinc-900 md:text-xl">USER</p>
              <p className="mt-2 text-sm font-bold text-zinc-400 md:text-base">Experience &amp; Value</p>
              <p className="mt-2 text-sm leading-6 text-zinc-700 md:text-lg">
                Đồng sáng tạo nội dung và trở thành micro-creator.
              </p>
            </article>
            <article>
              <p className="text-lg font-black uppercase tracking-[0.16em] text-zinc-900 md:text-xl">CREATOR</p>
              <p className="mt-2 text-sm font-bold text-zinc-400 md:text-base">Content &amp; Influence</p>
              <p className="mt-2 text-sm leading-6 text-zinc-700 md:text-lg">
                Nhận campaign, phát triển cá nhân và tạo thu nhập minh bạch.
              </p>
            </article>
          </div>
        </section>

        <section id="creator-homepage" className="mt-10 overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-900 text-white">
          <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
            <div className="p-8 md:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Creator Jobs</p>
              <h2 className="mt-3 text-3xl font-black md:text-4xl">Creator dễ dàng tìm job phù hợp</h2>
              <p className="mt-3 max-w-2xl text-base text-zinc-300">
                Duyệt nhanh cơ hội hợp tác, nhận job đúng tệp và bắt đầu kiếm hoa hồng dễ hơn.
              </p>
              <div className="mt-7">
                <HomepageSectionButton targetId="creator-homepage" />
              </div>
            </div>
            <div className="relative min-h-[300px] md:min-h-full">
              <Image
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80"
                alt="Creator làm việc trên chiến dịch"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950 via-zinc-950/40 to-transparent" />
            </div>
          </div>
        </section>

        <section id="brand-homepage" className="mt-10 overflow-hidden rounded-[2rem] border border-zinc-900 bg-zinc-900 text-white shadow-2xl shadow-zinc-200/30">
          <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
            <div className="p-8 md:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Brand Growth</p>
              <h2 className="mt-3 text-3xl font-black md:text-4xl">Brand bắt đầu chiến dịch nhanh hơn</h2>
              <p className="mt-3 max-w-2xl text-base text-zinc-300">
                Chọn gói phù hợp, để lại thông tin liên hệ và đội ngũ dCreator sẽ hỗ trợ bạn triển khai chiến dịch UGC theo mục tiêu doanh thu.
              </p>
              <div className="mt-7">
                <HomepageSectionButton targetId="brand-homepage" href="/brand" />
              </div>
            </div>
            <div className="relative min-h-[300px] md:min-h-full">
              <Image
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80"
                alt="Brand team lên kế hoạch chiến dịch"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950 via-zinc-950/40 to-transparent" />
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="inline-flex rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-200 backdrop-blur">Đối tác</p>
              <h2 className="mt-2 text-2xl font-black text-zinc-900">Các Brand đã hợp tác với dCreator</h2>
            </div>
            <p className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-semibold text-zinc-700">
              {partneredBrands.length} brands
            </p>
          </div>
          {partneredBrands.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {partneredBrands.map((brand) => (
                <article key={brand.name} className="rounded-2xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50 px-4 py-5 text-center shadow-sm">
                  <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
                    <PartnerLogo brandName={brand.name} logoUrl={brand.logoUrl} />
                  </div>
                  <p className="truncate text-base font-bold text-zinc-900">{brand.name}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">Brand sẽ hiển thị khi có chiến dịch đang hoạt động.</p>
          )}
        </section>

        <section className="relative mt-10 overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-6 text-white shadow-none md:p-8">
          <h2 className="text-2xl font-black text-zinc-900">Câu hỏi thường gặp</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {faqs.map((item) => (
              <article
                key={item.q}
                className={`rounded-2xl border p-5 ${
                  item.q.includes("Creator")
                    ? "border-sky-200 bg-sky-50"
                    : item.q.includes("Brand")
                      ? "border-amber-200 bg-amber-50"
                      : "border-zinc-200 bg-white"
                }`}
              >
                <p className="font-semibold text-zinc-900">{item.q}</p>
                <p className="mt-2 text-sm text-zinc-600">{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 overflow-hidden rounded-[2rem] border border-zinc-900 bg-zinc-900 text-white shadow-2xl shadow-zinc-200/30">
          <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
            <div className="relative min-h-[260px] md:min-h-[320px]">
              <Image
                src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1400&q=80"
                alt="Creator và Brand hợp tác"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950 via-zinc-950/30 to-transparent" />
            </div>
            <div className="p-6 md:p-8 lg:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Bắt đầu ngay</p>
              <h2 className="mt-2 text-2xl font-black text-white">Sẵn sàng mở rộng doanh thu cùng dCreator?</h2>
              <p className="mt-1 text-sm text-zinc-300">Chọn vai trò phù hợp để bắt đầu chiến dịch hoặc nhận job mới.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={isLoggedIn ? "/dashboard/user/upgrade" : "/auth/register?redirect=/&role=creator"} className="dc-btn-secondary border-white/15 bg-white text-zinc-900 hover:bg-zinc-100">
                  Đăng ký Creator
                </Link>
                <Link href={isLoggedIn ? "/dashboard/user/upgrade" : "/auth/register?redirect=/&role=brand"} className="dc-btn-primary bg-white text-zinc-900 hover:bg-zinc-100">
                  Đăng ký Brand
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />`r`n</>
  );
}
