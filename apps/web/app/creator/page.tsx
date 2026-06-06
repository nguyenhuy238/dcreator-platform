import Link from "next/link";
import Image from "next/image";
import { CampaignStatus } from "@prisma/client";
import { AnalyticsLink } from "@/app/components/analytics/AnalyticsLink";
import { TrackPageEvent } from "@/app/components/analytics/TrackPageEvent";
import { PublicFooter, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { AnalyticsEvents } from "@/lib/analytics-events";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { listCampaigns } from "@/lib/services/campaign.service";

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "DC";

const trustedBrands = [
  { name: "L'ORÉAL", initials: "L'O" },
  { name: "LA ROCHE-POSAY", initials: "LRP" },
  { name: "THE BODY SHOP", initials: "TBS" },
  { name: "innisfree", initials: "in" },
  { name: "Tiki", initials: "T" },
  { name: "belif", initials: "b" }
];

function MonoIcon({ kind }: { kind: "box" | "users" | "video" | "eye" | "chart" | "rocket" | "target" | "gauge" | "coins" | "doc" | "package" | "play" }) {
  if (kind === "box") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 4 7l8 4 8-4-8-4Z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" /></svg>;
  }
  if (kind === "users") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3.5 18c.9-2.8 3.1-4.2 5.5-4.2S13.6 15.2 14.5 18" /><path d="M14.5 17.5c.7-1.9 2.1-3 4-3 1.3 0 2.4.6 3 1.8" /></svg>;
  }
  if (kind === "video") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="14" height="12" rx="2" /><path d="m17 10 4-2v8l-4-2" /></svg>;
  }
  if (kind === "eye") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.8" /></svg>;
  }
  if (kind === "chart") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19h16" /><rect x="6" y="11" width="3" height="6" /><rect x="11" y="8" width="3" height="9" /><rect x="16" y="5" width="3" height="12" /></svg>;
  }
  if (kind === "rocket") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 4c2.5 0 5 2.5 5 5-2.3 1.4-4.7 2.8-7 4-1.2-2.3-2.6-4.7-4-7 2.5-1.4 4-2 6-2Z" /><path d="M9 13c-2 1-3 2-4 4l2 2c2-1 3-2 4-4" /><path d="M6 18 4 20" /></svg>;
  }
  if (kind === "target") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1.3" /></svg>;
  }
  if (kind === "gauge") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 15a8 8 0 1 1 16 0" /><path d="m12 12 4-3" /><path d="M12 12v.01" /></svg>;
  }
  if (kind === "coins") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><ellipse cx="12" cy="6" rx="6" ry="2.5" /><path d="M6 6v4.5C6 11.9 8.7 13 12 13s6-1.1 6-2.5V6" /><path d="M6 10.5V15c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4.5" /></svg>;
  }
  if (kind === "doc") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M10 12h6M10 16h6" /></svg>;
  }
  if (kind === "package") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m12 3 8 4-8 4-8-4 8-4Z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" /></svg>;
  }
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4z" /></svg>;
}

export default async function CreatorLandingPage() {
  const [campaignData, currentUser, featuredCreatorProfiles, brandCount, creatorCount, videoCount] = await Promise.all([
    listCampaigns({
      sort: "trending",
      page: 1,
      limit: 24,
      status: CampaignStatus.ACTIVE
    }),
    getCurrentUserFromServer(),
    prisma.creatorProfile.findMany({
      orderBy: [{ followerCount: "desc" }, { createdAt: "desc" }],
      take: 4,
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        handle: true,
        followerCount: true,
        contentCategory: true,
        socialLinks: {
          where: { isActive: true },
          orderBy: { followers: "desc" },
          take: 1,
          select: { handle: true, followers: true }
        }
      }
    }),
    prisma.brand.count(),
    prisma.creatorProfile.count(),
    prisma.missionSubmission.count({
      where: {
        OR: [{ videoUrl: { not: null } }, { socialPostUrl: { not: null } }]
      }
    })
  ]);

  const hasCreatorRole = Boolean(currentUser?.capabilities.creator);

  const activeCampaignCount = campaignData.pagination.total;
  const heroStats = [
    [brandCount, "Brand đồng hành"],
    [activeCampaignCount, "Campaign active"],
    [creatorCount, "Creator tham gia"],
    [videoCount, "Video UGC"]
  ] as const;
  const featuredCreators = featuredCreatorProfiles.map((creator) => {
    const social = creator.socialLinks[0];
    const followers = social?.followers ?? creator.followerCount ?? 0;
    const handle = social?.handle ?? creator.handle;

    return {
      id: creator.id,
      name: creator.displayName,
      avatar: creator.avatarUrl,
      handle: handle ? (handle.startsWith("@") ? handle : `@${handle}`) : "@dcreator",
      category: creator.contentCategory || "Creator Commerce",
      followers: `${formatCompactNumber(followers)} fans`
    };
  });

  const primaryCtaHref = !currentUser ? "/auth/register/creator" : hasCreatorRole ? "/dashboard/creator" : "/dashboard/user/upgrade";

  return (
    <>
      <TrackPageEvent eventName={AnalyticsEvents.CREATOR_LANDING_VIEW} />
      <PublicHeader
        hideRoleSwitch
        audienceToggle={{ href: "/brand", label: "Dành cho Brand" }}
      />
      <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 pb-24 pt-5 md:px-6">
        <section className="relative overflow-hidden rounded-[2.2rem] border border-zinc-200 bg-white px-5 py-9 shadow-sm md:px-8 md:py-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-white">Phát triển cùng thương hiệu thật</span>
              </div>

              <h1 className="mt-5 max-w-none text-3xl font-black leading-[1.08] text-zinc-950 md:text-[36px] lg:text-[40px] xl:text-[44px]">
                <span className="block whitespace-nowrap">Nơi Creator Biến Nội Dung</span>
                <span className="block whitespace-nowrap">Thành Doanh Thu Thật</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 md:text-lg">
                dCreator là hệ sinh thái social commerce kết nối bạn với các brand/SME. Nhận sản phẩm thật, làm video UGC theo brief rõ ràng, gắn giỏ hàng và nhận hoa hồng minh bạch trên từng đơn hàng. Từ 1.000 follower, bạn đã có thể bắt đầu xây profile và kiếm thêm thu nhập từ content của mình.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <AnalyticsLink
                  href={primaryCtaHref}
                  eventName={AnalyticsEvents.CREATOR_UPGRADE_CLICK}
                  eventParams={{ role: "creator", page_source: "creator_landing_hero" }}
                  className="dc-btn-primary min-w-[220px] rounded-xl px-6 text-base font-bold"
                >
                  Bắt Đầu Nhận Job UGC
                </AnalyticsLink>
                <Link href="#creator-how-it-works" className="dc-btn-secondary min-w-[220px] rounded-xl px-6 text-base font-semibold">
                  Xem Cách dCreator Hoạt Động
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[500px]">
              <div className="absolute -inset-4 rounded-[2rem] bg-zinc-200/70 blur-2xl" />
              <div className="relative rotate-2 rounded-[1.6rem] border-4 border-white bg-white p-3 shadow-[0_28px_70px_-35px_rgba(0,0,0,0.45)] ring-1 ring-zinc-200">
                <Image
                  src="/images/creator-ugc-hero.png"
                  alt="Creator đang sản xuất nội dung UGC cho chiến dịch social commerce"
                  width={1200}
                  height={900}
                  priority
                  className="aspect-[4/3] rounded-[1.1rem] object-cover"
                />
              </div>
            </div>
          </div>

          <div className="mt-7 grid overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50/80 md:grid-cols-4">
            {heroStats.map(([value, label], index) => (
              <article key={label} className={`px-4 py-4 text-center ${index < heroStats.length - 1 ? "md:border-r md:border-zinc-200" : ""}`}>
                <p className="text-3xl font-black text-zinc-900 md:text-4xl">{formatCompactNumber(value)}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="creator-how-it-works" className="mt-8 scroll-mt-24 rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-black text-zinc-900 md:text-4xl">Đặc Quyền Của Bạn</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Mọi thứ Creator cần để nhận job UGC, làm việc với brand thật và theo dõi thu nhập minh bạch.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-5">
            <article className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md lg:col-span-3">
              <div className="absolute -right-10 bottom-0 h-36 w-36 rounded-full bg-zinc-100" />
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-200">
                  <MonoIcon kind="rocket" />
                </div>
                <h3 className="mt-7 text-xl font-black text-zinc-950">Kho Job UGC Từ Brand Thật</h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                  Nhận brief rõ ràng, sản phẩm đã được chọn lọc từ SMEs/local brand, chỉ cần chọn campaign hợp với kênh của bạn và bắt đầu quay.
                </p>
                <ul className="mt-5 space-y-2 text-sm font-semibold text-zinc-700">
                  <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-zinc-950" />Job đều, có sẵn brief & deadline</li>
                  <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-zinc-950" />Làm với brand thật, case thật để xây profile</li>
                </ul>
              </div>
            </article>

            <article className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-white shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)] transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-900 lg:col-span-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950">
                <MonoIcon kind="box" />
              </div>
              <h3 className="mt-7 text-xl font-black">Nhận Sản Phẩm & Hoàn Tiền Review</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Tùy chiến dịch, bạn được nhận sản phẩm mẫu hoặc tự mua rồi được hoàn tiền sau review. Không phải tự đi “xin hàng”, mọi thứ được hệ thống ghi nhận và xử lý.
              </p>
            </article>

            <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-50 hover:shadow-md lg:col-span-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-sm">
                <MonoIcon kind="chart" />
              </div>
              <h3 className="mt-7 text-xl font-black text-zinc-950">Nhận tiền affiliate lên tới 12%</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Xem được hiệu quả từng video: click, đơn hàng, hoa hồng… ngay trong hệ thống dCreator, biết rõ nội dung nào chốt đơn tốt nhất.
              </p>
            </article>

            <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-50 hover:shadow-md lg:col-span-3">
              <div className="grid gap-5 md:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-950 text-white">
                    <MonoIcon kind="users" />
                  </div>
                  <h3 className="mt-6 text-xl font-black text-zinc-950">Cộng Đồng Creator Thực Chiến</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">
                    Tham gia nhóm Creator của dCreator để chia sẻ kinh nghiệm, nhận feedback nội dung, được ưu tiên thông tin camp mới và cơ hội làm việc với nhiều brand hơn.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 self-center">
                  {["Training miễn phí", "Feedback kịch bản", "Group riêng Creator", "Vinh danh hàng tuần"].map((label) => (
                    <span key={label} className="rounded-xl border border-zinc-200 bg-white px-3 py-4 text-center text-xs font-black text-zinc-950 shadow-sm">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 p-5 shadow-sm md:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full bg-zinc-900 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white">Quy trình</span>
            <h2 className="mt-4 text-3xl font-black leading-tight text-zinc-900 md:text-4xl">Quy trình triển khai</h2>
          </div>

          <div className="mt-9 overflow-x-auto pb-2">
            <div className="relative min-w-[980px]">
              <div className="absolute left-20 right-20 top-12 h-px bg-zinc-300" />
              <div className="grid grid-cols-5 gap-4">
                {[
                  ["1", "Tạo Campaign", "Đăng sản phẩm và mục tiêu chiến dịch.", "doc"],
                  ["2", "Creator Ứng Tuyển", "Nhận hồ sơ từ Creator phù hợp.", "users"],
                  ["3", "Duyệt & Gửi Sản Phẩm", "Phân phối reward hoặc sản phẩm tài trợ.", "package"],
                  ["4", "Nhận Nội Dung", "Creator sản xuất và đăng tải nội dung.", "play"],
                  ["5", "Đo Lường Hiệu Quả", "Theo dõi hiệu suất và tối ưu doanh thu.", "chart"]
                ].map(([step, title, description, kind], index, steps) => (
                  <article key={title} className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 text-center shadow-[0_16px_42px_-28px_rgba(24,24,27,0.55)] ring-1 ring-white transition-all duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_24px_58px_-32px_rgba(24,24,27,0.45)]">
                    <div className="absolute inset-x-0 top-0 h-1 bg-zinc-900" />
                    {index < steps.length - 1 ? (
                      <span className="absolute -right-5 top-10 z-20 hidden h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm lg:flex">
                        →
                      </span>
                    ) : null}
                    <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-zinc-900 text-lg font-black text-white shadow-[0_12px_30px_-18px_rgba(24,24,27,0.9)] ring-2 ring-zinc-300">
                      {step}
                    </div>
                    <div className="mx-auto mt-4 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50 text-zinc-700 shadow-sm ring-1 ring-zinc-200">
                      <MonoIcon kind={kind as "doc" | "users" | "package" | "play" | "chart"} />
                    </div>
                    <h3 className="mt-4 text-sm font-black uppercase leading-5 tracking-[0.04em] text-zinc-900">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 md:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-zinc-950 md:text-3xl">Creators Nổi Bật</h2>
              <p className="mt-2 text-sm text-zinc-600">Khám phá những gương mặt đang đồng hành cùng dCreator.</p>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-950 shadow-sm" aria-label="Creator trước">
                ‹
              </button>
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950 text-white shadow-sm" aria-label="Creator tiếp theo">
                ›
              </button>
            </div>
          </div>

          {featuredCreators.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredCreators.map((creator) => (
                <article key={creator.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <div className="relative aspect-[4/3] bg-zinc-100">
                    {creator.avatar ? (
                      <Image src={creator.avatar} alt={creator.name} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl font-black text-zinc-300">{getInitials(creator.name)}</div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-zinc-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">Live</span>
                  </div>
                  <div className="p-4">
                    <h3 className="truncate text-sm font-black text-zinc-950">{creator.name}</h3>
                    <p className="mt-1 truncate text-xs text-zinc-500">{creator.handle}</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-xs font-black text-zinc-950">{creator.followers}</span>
                      <span className="text-xs font-bold text-zinc-500">Theo dõi</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
              Chưa có Creator nổi bật trong hệ thống.
            </div>
          )}

          <div className="mt-10 overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white px-4 py-8 shadow-sm md:px-6">
            <h2 className="text-center text-2xl font-black text-zinc-950 md:text-3xl">Được tin tưởng bởi những thương hiệu hàng đầu</h2>
            <div className="dc-brand-strip-mask mt-6 overflow-hidden">
              <div className="dc-brand-strip-track flex w-max gap-3">
                {[...trustedBrands, ...trustedBrands, ...trustedBrands].map((brand, index) => (
                  <article key={`${brand.name}-${index}`} className="flex h-28 w-[210px] shrink-0 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-sm font-black text-zinc-950">
                      {brand.initials}
                    </div>
                    <h3 className="mt-3 text-xs font-black uppercase tracking-[0.08em] text-zinc-950">{brand.name}</h3>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-[1.5rem] border border-zinc-800 bg-zinc-950 px-5 py-10 text-center text-white shadow-[0_24px_70px_-35px_rgba(0,0,0,0.9)] md:px-8 md:py-14">
            <h2 className="mx-auto max-w-2xl text-3xl font-black leading-tight md:text-4xl">
              Sẵn sàng viết nên câu chuyện của bạn?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-300">
              Tham gia cộng đồng Creator dCreator để nhận job UGC, kết nối brand thật và xây profile nội dung của riêng mình.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <AnalyticsLink
                href="/auth/register"
                eventName={AnalyticsEvents.CREATOR_UPGRADE_CLICK}
                eventParams={{ role: "creator", page_source: "creator_landing_bottom" }}
                className="inline-flex min-w-[190px] items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-black !text-zinc-950 transition-colors hover:bg-zinc-200"
              >
                Trở Thành Creator
              </AnalyticsLink>
              <Link href="#creator-how-it-works" className="rounded-xl border border-white/20 px-6 py-3 text-sm font-black text-white transition-colors hover:bg-white hover:text-zinc-950">
                Khám Phá Cộng Đồng
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
