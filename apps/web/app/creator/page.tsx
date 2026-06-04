import Link from "next/link";
import { CampaignStatus } from "@prisma/client";
import { PublicFooter, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
import { listCampaigns } from "@/lib/services/campaign.service";

function formatRatio(value: number) {
  return `${value.toFixed(2)}x`;
}

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
  const [campaignData, currentUser] = await Promise.all([
    listCampaigns({
      sort: "trending",
      page: 1,
      limit: 24,
      status: CampaignStatus.ACTIVE
    }),
    getCurrentUserFromServer()
  ]);

  const hasCreatorRole = Boolean(currentUser?.capabilities.creator);

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

  const primaryCtaHref = !currentUser ? "/auth/register/creator" : hasCreatorRole ? "/dashboard/creator" : "/dashboard/user/upgrade";
  const primaryCtaLabel = hasCreatorRole ? "Vào Creator Dashboard" : "Đăng ký Creator";

  return (
    <>
      <PublicHeader
        hideRoleSwitch
        audienceToggle={{ href: "/brand", label: "Dành cho Brand" }}
      />
      <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 pb-24 pt-5 md:px-6">
        <section className="rounded-[2.2rem] bg-gradient-to-b from-zinc-100 via-zinc-50/50 to-white px-4 py-8 md:px-6 md:py-10">
          <div className="grid items-center gap-7 md:grid-cols-[1.08fr_0.92fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-200/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-700">#DIVIDENDS</span>
                <span className="rounded-full bg-zinc-200/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-700">#DOMINATION</span>
                <span className="rounded-full bg-zinc-200/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-700">#DEDICATED</span>
              </div>

              <h1 className="font-display mt-4 bg-gradient-to-b from-zinc-950 to-zinc-700 bg-clip-text text-[52px] font-black leading-none tracking-[-0.045em] text-transparent md:text-[88px]">
                dCREATOR
              </h1>
              <p className="mt-1 text-4xl font-medium italic leading-none text-zinc-400 [font-family:Georgia,'Times_New_Roman',serif] md:text-6xl">
                Creator Commerce Platform
              </p>

              <h2 className="mt-6 text-3xl font-semibold leading-tight text-zinc-600 md:text-4xl">
                Nơi Nội dung trở thành <span className="font-black text-zinc-900">Tài sản.</span>
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-zinc-600 md:text-[29px] md:leading-tight">
                Kết nối Brand, Creator và User để biến sức ảnh hưởng thành doanh thu thực tế.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href={primaryCtaHref} className="dc-btn-primary min-w-[220px] rounded-xl px-6 text-base font-bold">
                  {primaryCtaLabel}
                </Link>
                <Link href="/campaigns" className="dc-btn-secondary min-w-[220px] rounded-xl px-6 text-base font-semibold">
                  Xem campaign đang hoạt động
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200/80 bg-white/75 p-4 md:p-5">
              <div className="space-y-3">
                <article className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <div className="mb-1 flex items-center gap-2 text-zinc-700"><MonoIcon kind="box" /><p className="text-xl font-black text-zinc-900">1 sản phẩm</p></div>
                  <p className="text-sm text-zinc-500">Tạo campaign</p>
                </article>
                <article className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <div className="mb-1 flex items-center gap-2 text-zinc-700"><MonoIcon kind="users" /><p className="text-xl font-black text-zinc-900">100 Creator</p></div>
                  <p className="text-sm text-zinc-500">Tham gia chiến dịch</p>
                </article>
                <article className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <div className="mb-1 flex items-center gap-2 text-zinc-700"><MonoIcon kind="video" /><p className="text-xl font-black text-zinc-900">1.000 Video UGC</p></div>
                  <p className="text-sm text-zinc-500">Nội dung được tạo</p>
                </article>
                <article className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                  <div className="mb-1 flex items-center gap-2 text-zinc-700"><MonoIcon kind="eye" /><p className="text-xl font-black text-zinc-900">100.000 Người xem</p></div>
                  <p className="text-sm text-zinc-500">Tiếp cận tự nhiên</p>
                </article>
                <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <div className="mb-1 flex items-center gap-2 text-zinc-700"><MonoIcon kind="chart" /><p className="text-xl font-black text-zinc-900">Doanh thu</p></div>
                  <p className="text-sm text-zinc-500">Tăng trưởng bền vững</p>
                </article>
              </div>
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

        <section className="mt-10 rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-8">
          <div className="grid items-center gap-8 md:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-4">
              <div className="mx-auto flex h-[360px] w-[190px] flex-col justify-between rounded-[2rem] border border-zinc-200 bg-zinc-900 p-4 text-white shadow-lg">
                <div className="h-2 w-16 self-center rounded-full bg-zinc-700" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="h-14 rounded-xl bg-zinc-800/70" />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-center text-xs font-semibold">ROI 3.2x</div>
                  <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-center text-xs font-semibold">+48%</div>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-black leading-tight text-zinc-900 md:text-5xl">Tạo hàng trăm video UGC từ Creator thật</h2>
              <div className="mt-5 space-y-3">
                <div className="flex items-start gap-2 text-zinc-700">
                  <span className="mt-0.5 text-base text-zinc-700">•</span>
                  <p>Không cần booking KOL đắt đỏ.</p>
                </div>
                <div className="flex items-start gap-2 text-zinc-700">
                  <span className="mt-0.5 text-base text-zinc-700">•</span>
                  <p>Không cần tự tìm Creator.</p>
                </div>
                <div className="flex items-start gap-2 text-zinc-700">
                  <span className="mt-0.5 text-base text-zinc-700">•</span>
                  <p>dCreator giúp Brand triển khai chiến dịch UGC với quy trình minh bạch từ đăng campaign đến đo lường kết quả.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-8">
          <h2 className="text-center text-3xl font-black text-zinc-900 md:text-4xl">Vì sao Brand chọn dCreator?</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              ["Scale nội dung nhanh", "Tạo hàng chục đến hàng trăm video UGC cho mỗi chiến dịch.", "rocket"],
              ["Đúng Creator - Đúng khách hàng", "Gợi ý Creator phù hợp theo ngành hàng và mục tiêu chiến dịch.", "target"],
              ["Theo dõi hiệu suất minh bạch", "Quản lý lượt xem, tương tác và kết quả chiến dịch trên một nền tảng.", "gauge"],
              ["Tối ưu chi phí marketing", "Biến hàng hóa thành nguồn lực tăng trưởng thay vì chỉ là tồn kho.", "coins"]
            ].map(([title, description, kind]) => (
              <article key={title} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                  <MonoIcon kind={kind as "rocket" | "target" | "gauge" | "coins"} />
                </div>
                <h3 className="mt-4 text-lg font-bold text-zinc-900">{title}</h3>
                <p className="mt-2 text-sm text-zinc-600">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-8">
          <h2 className="text-center text-3xl font-black text-zinc-900 md:text-4xl">Quy trình triển khai</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {[
              ["1", "Tạo Campaign", "Đăng sản phẩm và mục tiêu chiến dịch.", "doc"],
              ["2", "Creator Ứng Tuyển", "Nhận hồ sơ từ Creator phù hợp.", "users"],
              ["3", "Duyệt & Gửi Sản Phẩm", "Phân phối reward hoặc sản phẩm tài trợ.", "package"],
              ["4", "Nhận Nội Dung", "Creator sản xuất và đăng tải nội dung.", "play"],
              ["5", "Đo Lường Hiệu Quả", "Theo dõi hiệu suất và tối ưu doanh thu.", "chart"]
            ].map(([step, title, description, kind]) => (
              <article key={title} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">{step}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                    <MonoIcon kind={kind as "doc" | "users" | "package" | "play" | "chart"} />
                  </div>
                </div>
                <h3 className="mt-4 text-base font-bold text-zinc-900">{title}</h3>
                <p className="mt-1 text-sm text-zinc-600">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-200 bg-zinc-50 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black text-zinc-900 md:text-4xl">Sẵn sàng tăng trưởng bằng UGC?</h2>
              <p className="mt-2 max-w-2xl text-zinc-600">
                Tham gia mạng lưới Creator Commerce đầu tiên giúp Brand mở rộng độ phủ nội dung và tăng cơ hội bán hàng.
              </p>
            </div>
            <Link href={primaryCtaHref} className="dc-btn-primary rounded-xl px-7">
              {primaryCtaLabel}
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
