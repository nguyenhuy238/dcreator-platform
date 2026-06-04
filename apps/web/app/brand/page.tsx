import Link from "next/link";
import { CampaignStatus } from "@prisma/client";
import { PublicFooter, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { getCurrentUserFromServer } from "@/lib/auth/current-user";
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

const trustedBrands = [
  { name: "L'ORÉAL", avatar: "L'O", className: "bg-zinc-950 text-white" },
  { name: "LA ROCHE-POSAY", avatar: "LRP", className: "bg-sky-50 text-sky-700 ring-sky-100" },
  { name: "THE BODY SHOP", avatar: "TBS", className: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  { name: "innisfree", avatar: "in", className: "bg-green-50 text-green-700 ring-green-100" },
  { name: "Tiki", avatar: "T", className: "bg-blue-50 text-blue-700 ring-blue-100" },
  { name: "belif", avatar: "b", className: "bg-indigo-50 text-indigo-700 ring-indigo-100" }
];

const reasons = [
  ["MỞ RỘNG SẢN XUẤT NỘI DUNG", ["Kết nối với mạng lưới Creator đa dạng.", "Tạo nhiều nội dung hơn với chi phí tối ưu.", "Triển khai chiến dịch nhiều chiến dịch."], "rocket"],
  ["SỐ HÓA QUY TRÌNH VẬN HÀNH", ["Tìm kiếm Creator phù hợp.", "Quản lý Campaign tập trung.", "Theo dõi tiến độ và nội dung trên một nền tảng duy nhất."], "gauge"],
  ["ĐO LƯỜNG BẰNG DOANH THU", ["Theo dõi đơn hàng và GMV.", "Đánh giá hiệu quả từng Creator.", "Tối ưu chiến dịch dựa trên dữ liệu thực tế."], "chart"],
  ["MINH BẠCH GIÁ TRỊ TẠO RA", ["Brand biết nội dung nào hiệu quả.", "Creator biết giá trị mình đóng góp.", "User tiếp cận thông tin đáng tin cậy hơn."], "coins"]
] as const;

const extraBenefits = [
  ["Đồng hành cùng thương hiệu", "Đội ngũ chuyên môn hỗ trợ từ chiến lược, triển khai đến tối ưu hiệu quả."],
  ["Cộng đồng phát triển", "Kết nối, học hỏi và phát triển cùng hàng nghìn Creator."],
  ["Bảo mật và an toàn dữ liệu", "Bảo vệ tuyệt đối thông tin cá nhân và dữ liệu của người dùng."]
];

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
  const primaryCtaHref = hasBrandRole ? "/dashboard/brand/campaigns" : "/brand/register";
  const primaryCtaLabel = hasBrandRole ? "Vào Brand Dashboard" : "Đăng ký Brand";
  const activeCampaignCount = campaignData.pagination.total || 13;
  const stats = creatorStats.map(([value, label]) => [label === "Campaign active" ? String(activeCampaignCount) : value, label]);

  return (
    <>
      <PublicHeader
        hideRoleSwitch
        audienceToggle={{ href: "/creator", label: "Dành cho Creator" }}
      />
      <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 pb-24 pt-5 md:px-6">
        <section className="rounded-[2.2rem] bg-gradient-to-b from-zinc-100 via-zinc-50/50 to-white px-4 py-8 md:px-6 md:py-10">
          <div className="mx-auto max-w-4xl text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-zinc-200/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-700">#UGC</span>
              <span className="rounded-full bg-zinc-200/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-700">#CREATOR</span>
              <span className="rounded-full bg-zinc-200/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-700">#SOCIALCOMMERCE</span>
            </div>

            <h1 className="font-display mt-4 bg-gradient-to-b from-zinc-950 to-zinc-700 bg-clip-text text-[46px] font-black leading-none tracking-[-0.045em] text-transparent md:text-[82px]">
              dCREATOR
            </h1>
            <p className="mt-1 text-4xl font-medium italic leading-none text-zinc-400 [font-family:Georgia,'Times_New_Roman',serif] md:text-6xl">
              Creator Landing
            </p>

            <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-semibold leading-tight text-zinc-600 md:text-5xl">
              Biến nội dung thành <span className="font-black text-zinc-900">doanh thu thực tế.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-zinc-600 md:text-[25px] md:leading-tight">
              Kết nối thương hiệu với mạng lưới Massive Creators (1k - 100k followers) để tạo nội dung UGC, thúc đẩy Social Commerce và tăng trưởng doanh thu.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link href={primaryCtaHref} className="dc-btn-primary min-w-[220px] rounded-xl px-6 text-base font-bold">
                {primaryCtaLabel}
              </Link>
              <Link href="/campaigns" className="dc-btn-secondary min-w-[220px] rounded-xl px-6 text-base font-semibold">
                Xem campaign đang hoạt động
              </Link>
            </div>
          </div>

          <div className="mt-7 grid overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50/80 md:grid-cols-4">
            {stats.map(([value, label], index) => (
              <article key={label} className={`px-4 py-4 text-center ${index < stats.length - 1 ? "md:border-r md:border-zinc-200" : ""}`}>
                <p className="text-3xl font-black text-zinc-900 md:text-4xl">{value}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-black text-zinc-900 md:text-4xl">Tại sao nên chọn dCreator</h2>
            <p className="mt-3 text-zinc-600">dCreator số hóa quy trình Brand - Creator - Campaign trên một nền tảng duy nhất.</p>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {reasons.map(([title, items, kind]) => (
              <article key={title} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                  <MonoIcon kind={kind} />
                </div>
                <h3 className="mt-4 text-base font-black text-zinc-900">{title}</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-600">
                  {items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-900" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="mt-8 rounded-[1.5rem] border border-zinc-200 bg-white p-5">
            <h3 className="text-center text-2xl font-black text-zinc-900">Và nhiều lợi ích khác</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {extraBenefits.map(([title, description], index) => (
                <article key={title} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">0{index + 1}</p>
                  <h4 className="mt-3 text-lg font-bold text-zinc-900">{title}</h4>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-8">
          <h2 className="text-center text-3xl font-black text-zinc-900 md:text-4xl">Quy trình triển khai</h2>
          <div className="mt-7 grid gap-4 lg:grid-cols-5">
            {processSteps.map(([step, title, description, kind], index) => (
              <article key={title} className="relative rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                {index < processSteps.length - 1 ? <div className="absolute left-[calc(100%-0.25rem)] top-8 hidden h-px w-5 bg-zinc-200 lg:block" /> : null}
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">{step}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                    <MonoIcon kind={kind} />
                  </div>
                </div>
                <h3 className="mt-4 text-sm font-black uppercase leading-5 tracking-[0.04em] text-zinc-900">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-8">
          <h2 className="text-center text-3xl font-black text-zinc-900 md:text-4xl">Được tin tưởng bởi những thương hiệu hàng đầu</h2>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {trustedBrands.map((brand) => (
              <article key={brand.name} className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-5 text-center shadow-sm">
                <div className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-black shadow-sm ring-1 ring-inset ${brand.className}`}>
                  {brand.avatar}
                </div>
                <p className="mt-4 text-sm font-black tracking-[0.08em] text-zinc-800 md:text-base">{brand.name}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-900 bg-zinc-950 p-6 text-white shadow-[0_25px_60px_-25px_rgba(0,0,0,0.8)] md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <h2 className="text-3xl font-black text-white md:text-4xl">Sẵn sàng biến nội dung thành doanh thu?</h2>
              <p className="mt-3 max-w-2xl text-zinc-300">
                Tham gia dCreator để kết nối với Brand, nhận campaign phù hợp và phát triển thu nhập từ nội dung UGC.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={primaryCtaHref} className="dc-btn-primary rounded-xl bg-white px-7 text-zinc-900 hover:bg-zinc-100">
                {primaryCtaLabel}
              </Link>
              <Link href="/campaigns" className="dc-btn-secondary rounded-xl border-white/15 bg-zinc-900 px-7 text-white hover:bg-zinc-800">
                Xem campaign đang hoạt động
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
