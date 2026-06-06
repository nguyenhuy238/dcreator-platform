"use client";

import { useState } from "react";
import type { CampaignDetailDTO } from "@/lib/dto/campaign-detail";

type Reward = CampaignDetailDTO["rewards"][number];
type WalletResponse = { success: boolean; data?: { wallet: { pointsBalance: number } }; error?: string };
type ContributionResponse = { success: boolean; data?: { voucher?: { code: string } | null }; error?: string };

function rewardAmount(reward: Reward) {
  return Math.max(1000, reward.pricePoints * 1000);
}

export function CampaignReviewProducts({ data }: { data: CampaignDetailDTO }) {
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [shipping, setShipping] = useState({ fullName: "", phone: "", address: "", note: "" });

  const productMission = data.missions.find((mission) => mission.productReceiveOption === "PRODUCT_REQUIRED") ?? null;
  const product = {
    name: data.hero.product.name ?? productMission?.productName ?? data.rewards[0]?.title ?? null,
    description: data.hero.product.description ?? productMission?.productDescription ?? data.rewards[0]?.description ?? null,
    imageUrl: data.hero.product.imageUrl ?? productMission?.productImageUrl ?? null,
    link: data.hero.product.link ?? productMission?.productLink ?? null
  };
  const hasProduct = Boolean(product.name || product.description || product.imageUrl || product.link);

  async function openRedeem(reward: Reward) {
    setNotice(null);
    if (!data.viewer.isLoggedIn) {
      window.location.assign(`/auth/register?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/wallet/me", { cache: "no-store" });
      const payload = (await response.json()) as WalletResponse;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Không thể tải số dư N-Points.");
      }
      if (payload.data.wallet.pointsBalance < reward.pricePoints) {
        throw new Error("Bạn chưa đủ N-Points để đổi sản phẩm này.");
      }
      setSelectedReward(reward);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Không thể đổi quà lúc này." });
    } finally {
      setLoading(false);
    }
  }

  async function confirmRedeem() {
    if (!selectedReward) return;
    setLoading(true);
    setNotice(null);
    try {
      // TODO: persist shipping details when the contribution API accepts fulfillment metadata.
      const response = await fetch(`/api/campaigns/${data.hero.slug}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewardId: selectedReward.id,
          paymentMethod: "N_POINTS",
          amount: rewardAmount(selectedReward),
          idempotencyKey: `redeem-${selectedReward.id}-${Date.now()}`
        })
      });
      const payload = (await response.json()) as ContributionResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Không thể xác nhận đổi quà.");
      }
      setSelectedReward(null);
      setShipping({ fullName: "", phone: "", address: "", note: "" });
      setNotice({ type: "success", text: "Đổi quà thành công. Voucher đã được cấp vào tài khoản của bạn." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Không thể xác nhận đổi quà." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="dc-card flex h-full flex-col p-5 md:p-6">
      <h3 className="text-2xl font-black text-zinc-900">Sản Phẩm Review</h3>
      {notice ? (
        <p
          className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.text}
        </p>
      ) : null}
      {!hasProduct && data.rewards.length === 0 ? (
        <div className="mt-4 rounded-[24px] border border-zinc-100 bg-zinc-50/70 p-5 text-sm text-zinc-600">
          Campaign này chưa có sản phẩm review.
        </div>
      ) : (
        <div className="mt-4 flex-1 space-y-4">
          {hasProduct ? (
            product.link ? (
              <a
                href={product.link}
                target="_blank"
                rel="noreferrer"
                className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-zinc-100 bg-zinc-50/70 transition-all duration-300 hover:-translate-y-1 hover:border-zinc-200 hover:shadow-lg hover:shadow-zinc-200/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20"
              >
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt={product.name ?? data.hero.title}
                    className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="h-40 bg-gradient-to-br from-emerald-50 to-teal-100" />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h4 className="text-lg font-black text-zinc-900 underline-offset-4 group-hover:underline">
                    {product.name ?? "Sản phẩm review"}
                  </h4>
                  <p className="mt-2 flex-1 text-sm text-zinc-600">
                    {product.description ?? "Brand sẽ gửi sản phẩm review theo brief của campaign."}
                  </p>
                </div>
              </a>
            ) : (
              <article className="flex h-full flex-col overflow-hidden rounded-[24px] border border-zinc-100 bg-zinc-50/70">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt={product.name ?? data.hero.title} className="h-40 w-full object-cover" />
                ) : (
                  <div className="h-40 bg-gradient-to-br from-emerald-50 to-teal-100" />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h4 className="text-lg font-black text-zinc-900">{product.name ?? "Sản phẩm review"}</h4>
                  <p className="mt-2 flex-1 text-sm text-zinc-600">
                    {product.description ?? "Brand sẽ gửi sản phẩm review theo brief của campaign."}
                  </p>
                </div>
              </article>
            )
          ) : null}

          {data.rewards.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {data.rewards.map((reward) => (
                <article key={reward.id} className="overflow-hidden rounded-[24px] border border-zinc-100 bg-white">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt={reward.title} className="h-36 w-full object-cover" />
                  ) : (
                    <div className="h-36 bg-gradient-to-br from-emerald-50 to-teal-100" />
                  )}
                  <div className="p-5">
                    {product.link ? (
                      <a href={product.link} target="_blank" rel="noreferrer" className="text-lg font-black text-zinc-900 hover:underline">
                        {reward.title}
                      </a>
                    ) : (
                      <h4 className="text-lg font-black text-zinc-900">{reward.title}</h4>
                    )}
                    <p className="mt-2 line-clamp-3 text-sm text-zinc-600">{reward.description}</p>
                    <button
                      type="button"
                      disabled={loading || reward.isOutOfStock}
                      className="mt-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => void openRedeem(reward)}
                    >
                      {reward.isOutOfStock ? "Đã hết quà" : "Đổi Quà"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      )}
      {selectedReward ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-zinc-950/55 p-4">
          <div role="dialog" aria-modal className="dc-card w-full max-w-xl p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Đổi sản phẩm</p>
                <h4 className="mt-1 text-xl font-black">{selectedReward.title}</h4>
              </div>
              <button type="button" className="dc-btn-secondary" onClick={() => setSelectedReward(null)}>
                Đóng
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <input
                className="dc-input"
                placeholder="Họ và tên"
                value={shipping.fullName}
                onChange={(event) => setShipping((current) => ({ ...current, fullName: event.target.value }))}
                required
              />
              <input
                className="dc-input"
                placeholder="Số điện thoại"
                value={shipping.phone}
                onChange={(event) => setShipping((current) => ({ ...current, phone: event.target.value }))}
                required
              />
              <textarea
                className="dc-input min-h-20"
                placeholder="Địa chỉ nhận hàng"
                value={shipping.address}
                onChange={(event) => setShipping((current) => ({ ...current, address: event.target.value }))}
                required
              />
              <textarea
                className="dc-input min-h-16"
                placeholder="Ghi chú"
                value={shipping.note}
                onChange={(event) => setShipping((current) => ({ ...current, note: event.target.value }))}
              />
              <button
                type="button"
                className="dc-btn-primary"
                disabled={loading || !shipping.fullName.trim() || !shipping.phone.trim() || !shipping.address.trim()}
                onClick={() => void confirmRedeem()}
              >
                {loading ? "Đang xử lý..." : "Xác nhận đổi quà"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
