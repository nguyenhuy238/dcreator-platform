import Link from "next/link";
import Image from "next/image";
import { CampaignStatus } from "@prisma/client";
import { AnalyticsLink } from "@/app/components/analytics/AnalyticsLink";
import { TrackPageEvent } from "@/app/components/analytics/TrackPageEvent";
import { BrandConsultationModal } from "@/app/brand/_components/BrandConsultationModal";
import { PublicFooter, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { AnalyticsEvents } from "@/lib/analytics-events";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { listCampaigns } from "@/lib/services/campaign.service";

type IconKind = "users" | "video" | "rocket" | "target" | "gauge" | "coins" | "doc" | "package" | "play" | "chart";

function MonoIcon({ kind }: { kind: IconKind }) {
  if (kind === "users") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3.5 18c.9-2.8 3.1-4.2 5.5-4.2S13.6 15.2 14.5 18" /><path d="M14.5 17.5c.7-1.9 2.1-3 4-3 1.3 0 2.4.6 3 1.8" /></svg>;
  }
  if (kind === "video") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="14" height="12" rx="2" /><path d="m17 10 4-2v8l-4-2" /></svg>;
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
  if (kind === "play") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19h16" /><rect x="6" y="11" width="3" height="6" /><rect x="11" y="8" width="3" height="9" /><rect x="16" y="5" width="3" height="12" /></svg>;
}

const creatorStats = [
  ["50+", "Brand đồng hành"],
  ["13", "Campaign active"],
  ["1.000+", "Video created"],
  ["100+", "Creator tham gia"]
];

const processSteps = [
  ["1", "BRAND ĐẶT YÊU CẦU", "Brand mua gói và gửi yêu cầu tạo campaign.", "doc"],
  ["2", "DCREATOR TẠO CAMPAIGN", "Thiết kế campaign trên hệ thống.", "package"],
  ["3", "CREATOR ĐĂNG KÝ THAM GIA", "Creators vào xem camp và đăng ký tham gia.", "users"],
  ["4", "BRAND DUYỆT CREATOR", "Duyệt Creator làm nội dung UGC theo brief, duyệt video để Creator đăng lên các kênh social commerce.", "play"],
  ["5", "DCREATOR THEO DÕI HIỆU QUẢ", "Theo dõi hiệu quả, hoàn thiện sản phẩm nếu có, cập nhật mã quảng cáo và giúp Brand tối ưu campaign cho các đợt sau.", "chart"]
] as const;

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

export default async function BrandHomePage() {
  const [campaignData, currentUser, systemCreators, creatorCount, videoCount] = await Promise.all([
    listCampaigns({
      sort: "trending",
      page: 1,
      limit: 24,
      status: CampaignStatus.ACTIVE
    }),
    getCurrentUserFromServer(),
    prisma.creatorProfile.findMany({
      orderBy: [{ followerCount: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        handle: true,
        followerCount: true,
        socialLinks: {
          where: { isActive: true },
          orderBy: { followers: "desc" },
          take: 1,
          select: { handle: true, followers: true }
        }
      }
    }),
    prisma.creatorProfile.count(),
    prisma.missionSubmission.count({
      where: {
        OR: [{ videoUrl: { not: null } }, { socialPostUrl: { not: null } }]
      }
    })
  ]);

  const primaryCtaHref = currentUser ? "/campaigns" : "/auth/register";
  const primaryCtaLabel = currentUser ? "Xem campaign" : "Đăng ký Brand";
  const activeCampaignCount = campaignData.pagination.total ?? 0;
  const stats = creatorStats.map(([value, label]) => [label === "Campaign active" ? String(activeCampaignCount) : value, label]);
  const communityCreators = systemCreators.map((creator) => {
    const social = creator.socialLinks[0];
    const followers = social?.followers ?? creator.followerCount ?? 0;
    const handle = social?.handle ?? creator.handle;

    return {
      name: creator.displayName,
      handle: handle ? (handle.startsWith("@") ? handle : `@${handle}`) : "Chưa cập nhật",
      followers: `${formatCompactNumber(followers)} followers`,
      avatar: creator.avatarUrl
    };
  });

  return (
    <>
      <TrackPageEvent eventName={AnalyticsEvents.BRAND_LANDING_VIEW} />
      <PublicHeader
        hideRoleSwitch
        audienceToggle={{ href: "/creator", label: "Dành cho Creator" }}
      />
      <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 pb-24 pt-5 sm:px-6 lg:px-8">
        <section className="rounded-[2.2rem] bg-gradient-to-b from-zinc-100 via-zinc-50/50 to-white px-4 py-8 md:px-6 md:py-10">
          <div className="mx-auto max-w-6xl text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-zinc-200/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-700">#UGC</span>
              <span className="rounded-full bg-zinc-200/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-700">#CREATOR</span>
              <span className="rounded-full bg-zinc-200/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-700">#SOCIALCOMMERCE</span>
            </div>

            <h1 className="font-display mt-4 bg-gradient-to-b from-zinc-950 to-zinc-700 bg-clip-text text-4xl font-black leading-none text-transparent sm:text-5xl md:text-6xl lg:text-7xl">
              dCREATOR
            </h1>
            <p className="mt-1 text-4xl font-medium italic leading-none text-zinc-400 [font-family:Georgia,'Times_New_Roman',serif] sm:text-5xl md:text-6xl">
              Brand Landing
            </p>

            <h2 className="mx-auto mt-6 max-w-5xl break-words text-2xl font-semibold leading-tight text-zinc-600 sm:text-3xl md:text-5xl">
              Biến nội dung thành <span className="font-black text-zinc-900">doanh thu thực tế.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-5xl text-base text-zinc-600 sm:text-lg md:text-xl lg:text-[25px] lg:leading-tight">
              Kết nối thương hiệu với mạng lưới Massive Creators (1k - 100k followers) để tạo nội dung UGC, thúc đẩy Social Commerce và tăng trưởng doanh thu.
            </p>

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <AnalyticsLink
                href={primaryCtaHref}
                eventName={AnalyticsEvents.BRAND_UPGRADE_CLICK}
                eventParams={{ role: "brand", page_source: "brand_landing_hero" }}
                className="dc-btn-primary w-full rounded-xl px-6 text-base font-bold sm:w-auto sm:min-w-[220px]"
              >
                {primaryCtaLabel}
              </AnalyticsLink>
              <Link href="/campaigns" className="dc-btn-secondary w-full rounded-xl px-6 text-base font-semibold sm:w-auto sm:min-w-[220px]">
                Xem campaign đang hoạt động
              </Link>
            </div>
          </div>

          <div className="mt-7 grid overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50/80 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(([value, label], index) => (
              <article key={label} className={`border-b border-zinc-200 px-4 py-4 text-center sm:[&:nth-child(odd)]:border-r lg:border-b-0 ${index < stats.length - 1 ? "lg:border-r" : ""}`}>
                <p className="text-3xl font-black text-zinc-900 sm:text-4xl">{value}</p>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 sm:text-xs">{label}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-200 bg-zinc-50 px-4 py-10 md:px-8 md:py-12">
          <div className="mx-auto max-w-5xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">
              Cộng đồng <span className="text-zinc-950">nhà sáng tạo</span> của dCreator
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-zinc-600 md:text-base">
              Những Creator đang tham gia hệ thống dCreator, sẵn sàng đồng hành cùng Brand trong các chiến dịch UGC và social commerce.
            </p>

            <div className="mx-auto mt-6 grid max-w-xl grid-cols-3 divide-x divide-zinc-200 rounded-2xl border border-zinc-200 bg-white px-3 py-4 shadow-sm">
              {[
                [formatCompactNumber(creatorCount), "Creator"],
                [formatCompactNumber(videoCount), "Video"],
                [String(activeCampaignCount), "Campaign"]
              ].map(([value, label]) => (
                <article key={label} className="px-3">
                  <p className="text-2xl font-black text-zinc-950 md:text-3xl">{value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                </article>
              ))}
            </div>

            {communityCreators.length > 0 ? (
              <div className="dc-creator-marquee-mask mt-8 overflow-hidden">
                <div className="dc-creator-marquee-track flex w-max gap-3">
                  {[...communityCreators, ...communityCreators].map((creator, index) => (
                    <article key={`${creator.handle}-${index}`} className="w-44 shrink-0 rounded-2xl border border-zinc-200 bg-white p-4 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-lg font-black text-zinc-700 shadow-sm ring-1 ring-zinc-200">
                        {creator.avatar ? (
                          <Image
                            src={creator.avatar}
                            alt={creator.name}
                            width={64}
                            height={64}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(creator.name)
                        )}
                      </div>
                      <h3 className="mt-3 truncate text-sm font-black text-zinc-950">{creator.name}</h3>
                      <p className="mt-1 truncate text-xs text-zinc-500">{creator.handle}</p>
                      <p className="mt-3 inline-flex items-center justify-center gap-1 text-xs font-black text-zinc-900">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-zinc-900" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.8-3 2.8-4.6 5.5-4.6s4.7 1.6 5.5 4.6" /><circle cx="17" cy="9" r="2.3" /><path d="M15 15.2c2.4-.4 4.4.8 5.5 3.3" /></svg>
                        {creator.followers}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white px-5 py-8 text-center text-sm text-zinc-500">
                Chưa có Creator trong hệ thống.
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 text-white shadow-[0_24px_70px_-35px_rgba(0,0,0,0.9)] md:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-black text-white md:text-4xl">Lợi ích cốt lõi cho doanh nghiệp</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Quản lý Creator, nội dung, hiệu suất và đối soát chiến dịch trên cùng một hệ thống.
            </p>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-5">
            <article className="rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-zinc-800 hover:shadow-md lg:col-span-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-zinc-950">
                <MonoIcon kind="rocket" />
              </div>
              <h3 className="mt-8 text-lg font-black text-white">Mở rộng nội dung UGC</h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
                Hệ thống hóa việc tuyển chọn Creator, nhận nội dung và theo dõi tiến độ để Brand có nguồn UGC đều đặn, dễ kiểm nghiệm theo dữ liệu thực tế.
              </p>
              <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5">
                <div className="flex -space-x-2">
                  {communityCreators.slice(0, 3).map((creator) => (
                    <span key={creator.handle} className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-[10px] font-black text-zinc-200 ring-2 ring-zinc-950">
                      {creator.avatar ? (
                        <Image src={creator.avatar} alt={creator.name} width={32} height={32} className="h-full w-full object-cover" />
                      ) : (
                        getInitials(creator.name)
                      )}
                    </span>
                  ))}
                </div>
                <span className="text-xs font-bold text-white">{formatCompactNumber(creatorCount)} Creator trong hệ thống</span>
              </div>
            </article>

            <article className="rounded-xl border border-white bg-white p-6 text-zinc-950 shadow-[0_18px_45px_-28px_rgba(255,255,255,0.9)] transition-all duration-300 hover:-translate-y-1 hover:border-zinc-200 hover:bg-zinc-50 hover:shadow-[0_24px_55px_-32px_rgba(255,255,255,0.95)] lg:col-span-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-950 text-white">
                <MonoIcon kind="gauge" />
              </div>
              <h3 className="mt-8 text-lg font-black text-zinc-950">Vận hành chiến dịch tập trung</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Brand theo dõi brief, duyệt Creator, quản lý nhiệm vụ và cập nhật trạng thái nội dung trong một luồng làm việc rõ ràng.
              </p>
              <Link href="#quy-trinh-trien-khai" className="mt-10 inline-flex text-xs font-bold text-zinc-950 underline decoration-zinc-300 decoration-2 underline-offset-4 transition-colors hover:decoration-zinc-950">
                Xem quy trình triển khai
              </Link>
            </article>

            <article className="rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-zinc-800 hover:shadow-md lg:col-span-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950">
                <MonoIcon kind="chart" />
              </div>
              <h3 className="mt-6 text-lg font-black text-white">Đo lường bằng doanh thu</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Kết nối hiệu quả nội dung với đơn hàng, GMV và kết quả campaign để tối ưu các đợt triển khai tiếp theo.
              </p>
            </article>

            <article className="rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-zinc-800 hover:shadow-md lg:col-span-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950">
                <MonoIcon kind="target" />
              </div>
              <h3 className="mt-6 text-lg font-black text-white">Minh bạch giá trị tạo ra</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Creator, Brand và đội ngũ vận hành cùng nhìn thấy nhiệm vụ, nội dung, trạng thái duyệt và dữ liệu đóng góp.
              </p>
            </article>

            <article className="rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-zinc-800 hover:shadow-md lg:col-span-1">
              <div className="rounded-xl border border-white/15 bg-white/[0.06] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">Trạng thái hệ thống</p>
                <div className="mt-5 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-white" />
                  <p className="text-xs font-bold text-white">Creator đã được ghi nhận</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section id="quy-trinh-trien-khai" className="mt-8 scroll-mt-24 rounded-[2rem] border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 p-5 shadow-sm md:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full bg-zinc-900 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white">Quy trình</span>
            <h2 className="mt-4 text-3xl font-black leading-tight text-zinc-900 md:text-4xl">Triển khai campaign trong 5 bước</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              dCreator chuẩn hóa luồng làm việc từ brief, tạo campaign, nhận Creator đến duyệt nội dung và tối ưu hiệu quả sau chiến dịch.
            </p>
          </div>

          <div className="mt-9 overflow-x-auto pb-2">
            <div className="relative min-w-[860px] lg:min-w-[980px]">
              <div className="absolute left-20 right-20 top-12 h-px bg-zinc-300" />
              <div className="grid grid-cols-5 gap-4">
                {processSteps.map(([step, title, description, kind], index) => (
                  <article key={title} className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 text-center shadow-[0_16px_42px_-28px_rgba(24,24,27,0.55)] ring-1 ring-white transition-all duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_24px_58px_-32px_rgba(24,24,27,0.45)]">
                    <div className="absolute inset-x-0 top-0 h-1 bg-zinc-900" />
                    {index < processSteps.length - 1 ? (
                      <span className="absolute -right-5 top-10 z-20 hidden h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm lg:flex">
                        →
                      </span>
                    ) : null}
                    <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-zinc-900 text-lg font-black text-white shadow-[0_12px_30px_-18px_rgba(24,24,27,0.9)] ring-2 ring-zinc-300">
                      {step}
                    </div>
                    <div className="mx-auto mt-4 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50 text-zinc-700 shadow-sm ring-1 ring-zinc-200">
                      <MonoIcon kind={kind} />
                    </div>
                    <h3 className="mt-4 text-sm font-black uppercase leading-5 tracking-[0.04em] text-zinc-900">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 bg-zinc-50 py-5 md:py-8">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-12 text-center text-white shadow-[0_24px_70px_-35px_rgba(0,0,0,0.9)] md:px-10 md:py-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_12%_75%,rgba(255,255,255,0.06),transparent_26%)]" />
            <div className="relative mx-auto max-w-3xl">
              <h2 className="text-3xl font-black tracking-tight text-white md:text-5xl">Sẵn sàng để bứt phá doanh thu?</h2>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-zinc-400 md:text-base">
                Hãy để dCreator giúp thương hiệu của bạn kết nối với hàng triệu khách hàng thông qua những người kể chuyện tài năng nhất.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <AnalyticsLink
                  href={primaryCtaHref}
                  eventName={AnalyticsEvents.BRAND_UPGRADE_CLICK}
                  eventParams={{ role: "brand", page_source: "brand_landing_bottom" }}
                  className="inline-flex w-full items-center justify-center rounded-md bg-white px-8 py-3 text-sm font-black !text-black transition-colors duration-200 hover:bg-zinc-200 sm:w-auto"
                >
                  Bắt đầu ngay hôm nay
                </AnalyticsLink>
                <BrandConsultationModal source="brand_landing_consultation" />
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
