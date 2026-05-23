"use client";

import { useState } from "react";
import Image from "next/image";

type Step = {
  title: string;
  copy: string;
  image: string;
};

export function ProcessBanner({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0);
  const current = steps[active] ?? steps[0];
  const next = () => setActive((s) => (s === steps.length - 1 ? 0 : s + 1));

  if (!current) return null;

  return (
    <button
      type="button"
      onClick={next}
      className="group block w-full overflow-hidden rounded-3xl border border-zinc-200 bg-white text-left transition hover:border-zinc-300"
      aria-label="Xem bước tiếp theo"
    >
      <article className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
        <div className="p-5 md:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Vận hành theo bước</p>

          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:p-5">
            <p className="text-2xl font-black text-zinc-900">{current.title}</p>
            <p className="mt-2 text-sm text-zinc-600 md:text-base">{current.copy}</p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-zinc-900 transition-all duration-500"
                style={{ width: `${((active + 1) / steps.length) * 100}%` }}
              />
            </div>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-lg font-bold text-zinc-700 transition group-hover:bg-zinc-100">
              &gt;
            </span>
          </div>
        </div>

        <div className="relative min-h-[240px] md:min-h-full">
          <Image src={current.image} alt={current.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 40vw" />
          <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950/75 via-zinc-950/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/20 bg-black/30 px-4 py-3 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-200">dCreator Flow</p>
            <p className="mt-1 text-sm font-semibold text-white">Kết nối đúng người, đúng nội dung, đúng mục tiêu tăng trưởng.</p>
          </div>
        </div>
      </article>
    </button>
  );
}
