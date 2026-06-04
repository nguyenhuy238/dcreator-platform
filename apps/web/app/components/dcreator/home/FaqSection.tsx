"use client";

import { useState } from "react";

type FaqItem = {
  q: string;
  a: string;
};

type FaqSectionProps = {
  faqs: FaqItem[];
};

const DEFAULT_VISIBLE_FAQS = 3;

export function FaqSection({ faqs }: FaqSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleFaqs = expanded ? faqs : faqs.slice(0, DEFAULT_VISIBLE_FAQS);
  const canToggle = faqs.length > DEFAULT_VISIBLE_FAQS;

  return (
    <section className="relative mt-10 overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-6 text-white shadow-none md:p-8">
      <h2 className="text-2xl font-black text-zinc-900">Câu hỏi thường gặp</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleFaqs.map((item) => (
          <article
            key={item.q}
            className={`rounded-2xl border p-5 transition-all duration-200 ${
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
      {canToggle ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="dc-btn-secondary rounded-full px-6 py-2 text-sm font-semibold text-zinc-900 transition-all duration-200"
          >
            {expanded ? "Thu gọn" : "Xem thêm câu hỏi"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
