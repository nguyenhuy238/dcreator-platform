import { PublicFooter, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { BrandConsultationPageForm } from "@/app/brand/_components/BrandConsultationPageForm";
import { BRAND_SUBSCRIPTION_PACKAGES } from "@/lib/constants/brand-subscription";

function formatPoints(value: number) {
  return `${value.toLocaleString("vi-VN")} N-Point`;
}

export default function BrandGetStartedPage() {
  return (
    <>
      <PublicHeader
        hideRoleSwitch
        audienceToggle={{ href: "/creator", label: "Dành cho Creator" }}
      />

      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-5 sm:px-6 lg:px-8">
        <section className="rounded-[2.2rem] bg-gradient-to-b from-zinc-100 via-zinc-50/60 to-white px-5 py-10 md:px-8 md:py-12">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Brand onboarding</p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-zinc-950 md:text-5xl">
              Chọn gói phù hợp và để dCreator tư vấn lộ trình triển khai
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600 md:text-base">
              Xem nhanh các gói cho Brand và gửi thông tin để đội ngũ dCreator liên hệ tư vấn, đề xuất Creator phù hợp và lên campaign theo mục tiêu của bạn.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)]">
          <div className="grid gap-4">
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-zinc-950">Mục tiêu gói</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Chọn mức triển khai phù hợp với giai đoạn thương hiệu của bạn. dCreator sẽ tư vấn cách đi campaign, Creator và nội dung theo đúng mục tiêu.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {BRAND_SUBSCRIPTION_PACKAGES.map((item) => (
                <article key={item.code} className="dc-card flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold text-zinc-900">{item.name}</h2>
                    <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                      {item.code === "FREE" ? "Khởi động" : "UGC"}
                    </span>
                  </div>

                  <p className="mt-1 text-2xl font-bold text-zinc-900">{formatPoints(item.pricePoints)}</p>
                  <p className="mt-3 text-sm text-zinc-600">{item.summary}</p>

                  {item.features.length > 0 ? (
                    <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                      {item.features.slice(0, 4).map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-zinc-700">
                      Phù hợp để bắt đầu test creator marketing với chi phí thấp.
                    </p>
                  )}

                  {item.code === "FREE" && item.specialFeatures?.length ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm font-bold text-emerald-700">Ưu đãi gói Free</p>
                      <ul className="mt-2 space-y-2 text-sm text-emerald-800">
                        {item.specialFeatures.slice(0, 3).map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <BrandConsultationPageForm source="brand_get_started_page" />
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
