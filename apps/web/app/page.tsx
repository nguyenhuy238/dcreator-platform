import Link from "next/link";
import Image from "next/image";
import { CampaignCard } from "@/app/campaigns/_components/CampaignCard";
import { ProcessBanner } from "@/app/components/dcreator/home/ProcessBanner";
import { PublicFooter, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { listCampaigns } from "@/lib/services/campaign.service";

const highlights = [
  {
    title: "Creator",
    copy: "Dễ tìm job phù hợp, nhận hoa hồng theo hiệu quả nội dung."
  },
  {
    title: "Brand/SME",
    copy: "Tối ưu chi phí triển khai, đo rõ hiệu quả chuyển đổi."
  },
  {
    title: "dCreator",
    copy: "Kết nối Creator và Brand trong một quy trình minh bạch."
  }
];

const processSteps = [
  {
    title: "1. Brand đưa sản phẩm",
    copy: "Brand/SME đưa sản phẩm hoặc lô hàng lên nền tảng để tạo campaign phù hợp mục tiêu.",
    image: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=1200&q=80"
  },
  {
    title: "2. Creator nhận job",
    copy: "Creator chọn job đúng tệp, làm nội dung review hoặc livestream và phân phối trên kênh cá nhân.",
    image: "https://images.unsplash.com/photo-1494173853739-c21f58b16055?w=1200&q=80"
  },
  {
    title: "3. Tăng chuyển đổi",
    copy: "Brand theo dõi doanh thu, hiệu quả nội dung và tối ưu campaign theo dữ liệu thực tế.",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80"
  }
];

const roleCards = [
  {
    title: "Creator nhận được gì",
    points: [
      "Dễ tìm job đúng năng lực và tệp người xem",
      "Có thêm thu nhập từ hoa hồng theo hiệu quả",
      "Tăng uy tín cá nhân qua các chiến dịch thật"
    ]
  },
  {
    title: "Brand nhận được gì",
    points: [
      "Giảm chi phí triển khai social commerce",
      "Theo dõi rõ creator nào tạo ra đơn hàng",
      "Mở rộng đội ngũ bán hàng bằng nội dung"
    ]
  }
];

const testimonials = [
  {
    quote: "Mình nhận job nhanh hơn, brief rõ hơn và dễ theo dõi hiệu quả từng nội dung đã đăng.",
    name: "Linh - Creator"
  },
  {
    quote: "Brand có thể nhìn thấy doanh thu theo chiến dịch và tối ưu ngân sách dễ hơn rất nhiều.",
    name: "SnackGo - Brand"
  }
];

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
    q: "Brand đo hiệu quả như thế nào?",
    a: "Brand theo dõi được doanh thu, tỷ lệ chuyển đổi, hiệu quả từng creator và chi phí theo campaign."
  }
];

export default async function HomePage() {
  const featuredCampaigns = await listCampaigns({
    sort: "trending",
    page: 1,
    limit: 3,
    status: "ACTIVE"
  });
  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 md:px-6">
        <section className="dc-card overflow-hidden p-6 md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Creator Commerce Platform</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-zinc-900 md:text-5xl">
            Kết nối ảnh hưởng, mở rộng doanh thu.
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-600">
            dCreator giúp Creator và Brand hợp tác hiệu quả hơn, minh bạch hơn và tăng trưởng bền vững hơn.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/campaigns" className="dc-btn-primary">
              Khám phá chiến dịch
            </Link>
            <Link href="/auth/register" className="dc-btn-secondary">
              Tạo tài khoản
            </Link>
            <Link href="/dashboard/user/profile" className="dc-btn-secondary">
              Nâng cấp role tại Profile
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <article key={item.title} className="dc-card p-5">
              <p className="text-xs uppercase tracking-wider text-zinc-500">{item.title}</p>
              <p className="mt-2 text-sm text-zinc-600">{item.copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-2xl font-black">Cách dCreator vận hành</h2>
            <p className="mt-1 text-sm text-zinc-600">Mô hình ngắn gọn để Creator và Brand cùng tăng trưởng.</p>
          </div>
          <ProcessBanner steps={processSteps} />
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-black">Chiến dịch nổi bật</h2>
            <Link href="/campaigns" className="text-sm font-semibold text-zinc-600">
              Xem tất cả
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredCampaigns.items.map((campaign) => (
              <CampaignCard key={campaign.slug} campaign={campaign} />
            ))}
          </div>
        </section>

        <section className="mt-10 overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-900 text-white">
          <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
            <div className="p-8 md:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Creator Jobs</p>
              <h2 className="mt-3 text-3xl font-black md:text-4xl">Creator dễ dàng tìm job phù hợp</h2>
              <p className="mt-3 max-w-2xl text-base text-zinc-300">
                Duyệt nhanh cơ hội hợp tác, nhận job đúng tệp và bắt đầu kiếm hoa hồng dễ hơn.
              </p>
              <div className="mt-7">
                <Link href="/dashboard/user/profile" className="dc-btn-primary bg-white text-zinc-900 hover:bg-zinc-100">
                  Đăng ký Creator tại Profile
                </Link>
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

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {roleCards.map((card) => (
            <article
              key={card.title}
              className={`dc-card p-6 ${card.title.includes("Creator") ? "bg-sky-50/80" : "bg-amber-50/80"}`}
            >
              <h3 className="text-xl font-black text-zinc-900">{card.title}</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
                {card.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {testimonials.map((item) => (
            <article key={item.name} className="dc-card bg-zinc-50 p-6">
              <p className="text-sm text-zinc-700">&quot;{item.quote}&quot;</p>
              <p className="mt-4 text-sm font-bold text-zinc-900">{item.name}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-[2rem] border border-zinc-200 bg-zinc-50 p-6 md:p-8">
          <h2 className="text-2xl font-black text-zinc-900">Câu hỏi thường gặp</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
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
                <Link href="/dashboard/user/profile" className="dc-btn-secondary border-white/15 bg-white text-zinc-900 hover:bg-zinc-100">
                  Đăng ký Creator
                </Link>
                <Link href="/dashboard/user/profile" className="dc-btn-primary bg-white text-zinc-900 hover:bg-zinc-100">
                  Đăng ký Brand
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}


