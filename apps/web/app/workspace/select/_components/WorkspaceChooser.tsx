"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { WorkspaceCard, WorkspaceChoiceUser } from "@/lib/auth/workspace-choice";
import { getWorkspaceCards } from "@/lib/auth/workspace-choice";

type Props = {
  user: WorkspaceChoiceUser & { displayName: string };
};

export function WorkspaceChooser({ user }: Props) {
  const cards = useMemo(() => getWorkspaceCards(user), [user]);
  const brands = user.brandMemberships ?? [];
  const [selectedBrandId, setSelectedBrandId] = useState(brands[0]?.id ?? "");
  const [pendingBrandSwitch, setPendingBrandSwitch] = useState(false);
  const [error, setError] = useState("");

  async function openBrandWorkspace() {
    if (!selectedBrandId) return;
    setPendingBrandSwitch(true);
    setError("");
    try {
      const response = await fetch("/api/brand/current", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandId: selectedBrandId })
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error ?? "Không thể chọn Brand");
      window.location.href = "/dashboard/brand";
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "Không thể chọn Brand");
    } finally {
      setPendingBrandSwitch(false);
    }
  }

  const hasCreator = cards.some((card) => card.id === "creator");
  const hasBrand = cards.some((card) => card.id === "brand");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 md:px-6">
      <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6">
        <p className="text-sm font-semibold text-zinc-500">Xin chào, {user.displayName}</p>
        <h1 className="mt-1 text-2xl font-black text-zinc-900 md:text-3xl">Chọn workspace bạn muốn vào</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {cards.map((card: WorkspaceCard) => (
          <article key={card.id} className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{card.title}</p>
            <p className="mt-2 text-base font-semibold text-zinc-900">{card.label}</p>
            <p className="mt-1 text-sm text-zinc-600">{card.description}</p>

            {card.id === "brand" && brands.length > 1 ? (
              <div className="mt-4 space-y-2">
                <select className="dc-input" value={selectedBrandId} onChange={(event) => setSelectedBrandId(event.target.value)}>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name} ({brand.role})
                    </option>
                  ))}
                </select>
                <button className="dc-btn-primary w-full" onClick={() => void openBrandWorkspace()} disabled={pendingBrandSwitch}>
                  {pendingBrandSwitch ? "Đang chuyển..." : "Vào Brand Dashboard"}
                </button>
              </div>
            ) : card.id === "brand" ? (
              <button className="dc-btn-primary mt-4 w-full" onClick={() => void openBrandWorkspace()} disabled={pendingBrandSwitch || brands.length === 0}>
                {pendingBrandSwitch ? "Đang chuyển..." : "Vào Brand Dashboard"}
              </button>
            ) : (
              <Link href={card.href} className="dc-btn-primary mt-4 inline-flex w-full justify-center">
                {card.label}
              </Link>
            )}
          </article>
        ))}
      </section>

      {!hasCreator || !hasBrand ? (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
          <p className="text-sm font-semibold text-zinc-800">Nâng cấp thêm workspace</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!hasCreator ? (
              <Link href="/dashboard/user/profile" className="dc-btn-secondary">
                Trở thành Creator
              </Link>
            ) : null}
            {!hasBrand ? (
              <Link href="/brand/register" className="dc-btn-secondary">
                Tạo Brand mới
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
    </main>
  );
}
