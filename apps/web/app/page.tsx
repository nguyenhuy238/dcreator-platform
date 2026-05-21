import Link from "next/link";
import { CampaignCard, RewardCard } from "@/app/components/dcreator/cards/campaign";
import { mockCampaigns } from "@/app/components/dcreator/data/mock";
import { PublicFooter, PublicHeader } from "@/app/components/dcreator/layout/shell";

const benefits = [
  { title: "Backer", copy: "Ủng hộ campaign, chọn reward, nhận voucher minh bạch theo tiến độ." },
  { title: "Creator", copy: "Nhận mission, nộp proof, theo dõi KPI và hoa hồng realtime." },
  { title: "Brand", copy: "Tạo campaign, duyệt proof, quản lý ngân sách prepaid và chuyển đổi." }
];

export default function HomePage() {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 md:px-6">
        <section className="dc-card overflow-hidden p-6 md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Creator Commerce Platform</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-zinc-900 md:text-5xl">Biến campaign thành tăng trưởng thật với creator, reward và social commerce.</h1>
          <p className="mt-3 max-w-2xl text-zinc-600">dCreator kết nối fan, creator và brand trong một flow minh bạch: ủng hộ, mission, proof, voucher, payout.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/campaigns" className="dc-btn-primary">Khám phá campaign</Link>
            <Link href="/dashboard/creator" className="dc-btn-secondary">Dành cho Creator</Link>
            <Link href="/dashboard/brand" className="dc-btn-secondary">Dành cho Brand</Link>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between"><h2 className="text-2xl font-black">Featured campaigns</h2><Link href="/campaigns" className="text-sm font-semibold text-zinc-600">Xem tất cả</Link></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{mockCampaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} />)}</div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">{benefits.map((item) => <article key={item.title} className="dc-card p-5"><p className="text-xs uppercase tracking-wider text-zinc-500">{item.title}</p><p className="mt-2 text-sm text-zinc-600">{item.copy}</p></article>)}</section>

        <section className="mt-10">
          <h2 className="text-2xl font-black">Reward nổi bật</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <RewardCard title="Voucher 20% FreshSkin" description="Áp dụng cho combo dưỡng da" price="290 N-Points" stock={140} benefits={["Áp dụng toàn quốc", "Gộp ưu đãi mission"]} eta="Sau xác nhận" />
            <RewardCard title="Creator Kit" description="Áo + badge + tài liệu chiến dịch" price="590 N-Points" stock={44} benefits={["Limited batch", "Free shipping"]} eta="5-7 ngày" />
            <RewardCard title="Meet & Greet" description="Buổi giao lưu private với creator" price="1290 N-Points" stock={0} benefits={["Q&A trực tiếp", "Signed photo"]} eta="Theo lịch" />
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
