"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };

type CampaignApplicationItem = {
  id: string;
  lifecycleStatus: string;
  note: string | null;
  account: {
    id: string;
    email: string;
    displayName: string;
    creatorProfile: {
      mainPlatform: string;
      followerCount: number | null;
      contentCategory: string | null;
      socialUrl: string;
    } | null;
  };
  mission: {
    campaign: {
      id: string;
      title: string;
      brand: { id: string; displayName: string };
    };
  };
};

type CreatorMissionItem = {
  id: string;
  status: string;
  productReceiveOption: string;
  productStatus: string;
  depositStatus: string;
  reimbursementStatus: string;
  publishStatus: string;
  publishFeedback: string | null;
  mission: {
    title: string;
    rewardPoints: number;
    productLink: string | null;
  };
  campaign: {
    id: string;
    brandId: string;
    title: string;
  };
  account: {
    displayName: string;
    email: string;
    creatorProfile: {
      mainPlatform: string;
      socialUrl: string;
      followerCount: number | null;
    } | null;
  };
  submission: {
    socialPostUrl: string | null;
    proofTextNote: string | null;
    screenshotUrl: string | null;
    fileUploadUrl: string | null;
    note: string | null;
  } | null;
};

export default function AdminCampaignApplicationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [items, setItems] = useState<CampaignApplicationItem[]>([]);
  const [creatorMissions, setCreatorMissions] = useState<CreatorMissionItem[]>([]);

  const [campaignId, setCampaignId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [status, setStatus] = useState("");
  const [platform, setPlatform] = useState("");
  const [followerMin, setFollowerMin] = useState("");
  const [followerMax, setFollowerMax] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (campaignId.trim()) params.set("campaignId", campaignId.trim());
      if (brandId.trim()) params.set("brandId", brandId.trim());
      if (status) params.set("status", status);
      if (platform) params.set("platform", platform);
      if (followerMin) params.set("followerMin", followerMin);
      if (followerMax) params.set("followerMax", followerMax);
      if (query.trim()) params.set("query", query.trim());

      const [applicationRes, creatorMissionRes] = await Promise.all([
        fetch(`/api/admin/campaign-applications?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/admin/dashboard/creator-missions", { cache: "no-store" })
      ]);

      const applicationBody = (await applicationRes.json()) as ApiResult<CampaignApplicationItem[]>;
      const creatorMissionBody = (await creatorMissionRes.json()) as ApiResult<CreatorMissionItem[]>;

      if (!applicationRes.ok || !applicationBody.success) throw new Error(applicationBody.error ?? "Tải danh sách đơn ứng tuyển thất bại");
      if (!creatorMissionRes.ok || !creatorMissionBody.success) throw new Error(creatorMissionBody.error ?? "Tải nhiệm vụ Creator thất bại");

      setItems(applicationBody.data);
      setCreatorMissions(creatorMissionBody.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải danh sách đơn ứng tuyển thất bại");
    } finally {
      setLoading(false);
    }
  }, [brandId, campaignId, followerMax, followerMin, platform, query, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decideCreatorMission(
    id: string,
    action:
      | "CONFIRM_DEPOSIT_AND_PRODUCT_RECEIVED"
      | "APPROVE_PURCHASE_PROOF"
      | "REJECT_PURCHASE_PROOF"
      | "APPROVE_PUBLISH_REPORT"
      | "REJECT_PUBLISH_REPORT"
  ) {
    setError("");
    setNotice("");
    const actionLabel =
      action === "CONFIRM_DEPOSIT_AND_PRODUCT_RECEIVED"
        ? "xác nhận cọc và nhận sản phẩm"
        : action === "APPROVE_PURCHASE_PROOF"
        ? "duyệt bằng chứng mua hàng"
        : action === "REJECT_PURCHASE_PROOF"
          ? "từ chối bằng chứng mua hàng"
          : action === "APPROVE_PUBLISH_REPORT"
            ? "duyệt báo cáo đăng bài và cộng điểm"
            : "từ chối báo cáo đăng bài";
    if (!window.confirm(`Xác nhận ${actionLabel}?`)) return;

    let reason: string | undefined;
    let purchaseAmountVnd: number | undefined;

    if (action === "REJECT_PURCHASE_PROOF" || action === "REJECT_PUBLISH_REPORT") {
      reason = window.prompt("Nhập lý do từ chối:", "Nội dung chưa đạt yêu cầu")?.trim();
      if (!reason) return;
    }

    if (action === "APPROVE_PUBLISH_REPORT") {
      const raw = window.prompt("Nhập số tiền mua hàng (VND) để cộng bù vào N-Points:", "0")?.trim();
      if (!raw) return;
      const amount = Number(raw);
      if (!Number.isFinite(amount) || amount < 0) {
        setError("Số tiền mua hàng không hợp lệ");
        return;
      }
      purchaseAmountVnd = Math.floor(amount);
    }

    try {
      const res = await fetch(`/api/admin/dashboard/creator-missions/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason, purchaseAmountVnd })
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error ?? "Thao tác thất bại");

      setNotice("Đã cập nhật workflow creator mission thành công.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác thất bại");
    }
  }

  const creatorMissionFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = followerMin ? Number(followerMin) : undefined;
    const max = followerMax ? Number(followerMax) : undefined;

    return creatorMissions.filter((item) => {
      if (campaignId.trim() && item.campaign.id !== campaignId.trim()) return false;
      if (brandId.trim() && item.campaign.brandId !== brandId.trim()) return false;

      const profile = item.account.creatorProfile;
      if (platform && profile?.mainPlatform !== platform) return false;

      const followerCount = profile?.followerCount ?? 0;
      if (typeof min === "number" && Number.isFinite(min) && followerCount < min) return false;
      if (typeof max === "number" && Number.isFinite(max) && followerCount > max) return false;

      if (q) {
        const haystack = [
          item.account.displayName,
          item.account.email,
          profile?.socialUrl,
          item.mission.title,
          item.campaign.title,
          item.submission?.socialPostUrl,
          item.submission?.proofTextNote
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [brandId, campaignId, creatorMissions, followerMax, followerMin, platform, query]);

  const productQueue = useMemo(
    () =>
      creatorMissionFiltered.filter(
        (item) =>
          item.productReceiveOption === "PRODUCT_REQUIRED" &&
          (item.status === "PRODUCT_PENDING" || item.reimbursementStatus === "PURCHASE_SUBMITTED")
      ),
    [creatorMissionFiltered]
  );

  const payoutQueue = useMemo(
    () => creatorMissionFiltered.filter((item) => item.publishStatus === "PENDING"),
    [creatorMissionFiltered]
  );

  const reviewQueue = useMemo(
    () => items.filter((item) => item.lifecycleStatus === "ACCEPTED"),
    [items]
  );

  return (
    <>
      <PageHeader
        title="Đơn ứng tuyển chiến dịch"
        subtitle="Duyệt đơn ứng tuyển, xử lý sản phẩm và duyệt hoàn tiền/cộng điểm cho Creator trong cùng màn hình."
        action={<button className="dc-btn-secondary" onClick={() => void load()}>Làm mới</button>}
      />

      <section className="dc-card p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <input className="dc-input" placeholder="Campaign ID" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
          <input className="dc-input" placeholder="Brand ID" value={brandId} onChange={(e) => setBrandId(e.target.value)} />
          <select className="dc-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="ACCEPTED">APPLIED</option>
            <option value="DOING">ADMIN_APPROVED / SENT_TO_BRAND / ASSIGNED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <select className="dc-input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="">Tất cả nền tảng</option>
            <option value="TIKTOK">TIKTOK</option>
            <option value="INSTAGRAM">INSTAGRAM</option>
            <option value="YOUTUBE">YOUTUBE</option>
            <option value="FACEBOOK">FACEBOOK</option>
            <option value="OTHER">OTHER</option>
          </select>
          <input className="dc-input" placeholder="Follower tối thiểu" value={followerMin} onChange={(e) => setFollowerMin(e.target.value)} />
          <input className="dc-input" placeholder="Follower tối đa" value={followerMax} onChange={(e) => setFollowerMax(e.target.value)} />
          <input className="dc-input md:col-span-2" placeholder="Tìm tên/email/link mạng xã hội" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="dc-btn-primary mt-3" onClick={() => void load()}>Lọc</button>
      </section>

      {notice ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
      {loading ? <div className="mt-4"><LoadingSkeleton rows={4} /></div> : null}
      {error ? <div className="mt-4"><ErrorState title="Không tải được application queue" description={error} onRetry={() => void load()} /></div> : null}

      {!loading && !error ? (
        <>
          <section className="mt-4">
            <h2 className="text-xl font-bold">Đơn xin làm nhiệm vụ</h2>
            {reviewQueue.length === 0 ? (
              <div className="mt-3"><EmptyState title="Không có creator applications" description="Không có dữ liệu phù hợp bộ lọc." /></div>
            ) : (
              <div className="mt-3 grid gap-3">
                {reviewQueue.map((item) => (
                  <article key={item.id} className="dc-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.account.displayName}</p>
                        <p className="text-xs text-zinc-500">
                          {item.account.email} • {item.account.creatorProfile?.mainPlatform ?? "Không có"} • {item.account.creatorProfile?.followerCount ?? 0} người theo dõi
                        </p>
                        <p className="text-xs text-zinc-500">Campaign: {item.mission.campaign.title} • Brand: {item.mission.campaign.brand.displayName}</p>
                      </div>
                      <StatusBadge status={item.lifecycleStatus.toLowerCase()} />
                    </div>
                    {item.note ? <p className="mt-2 text-sm text-zinc-600 line-clamp-2">{item.note}</p> : null}
                    <div className="mt-3">
                      <Link className="dc-btn-primary" href={`/admin/campaign-applications/${item.id}`}>Xem chi tiết</Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold">Xử lý sản phẩm (Creator tự mua)</h2>
            {productQueue.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-600">Không có nhiệm vụ cần xử lý sản phẩm theo bộ lọc hiện tại.</p>
            ) : (
              <div className="mt-3 grid gap-3">
                {productQueue.map((item) => {
                  const canReviewPurchaseProof = item.reimbursementStatus === "PURCHASE_SUBMITTED";
                  const canConfirmDeposit =
                    item.productReceiveOption === "PRODUCT_REQUIRED" &&
                    item.productStatus === "WAITING_DEPOSIT" &&
                    item.depositStatus !== "HELD";
                  return (
                    <article key={item.id} className="dc-card p-4">
                      <p className="font-semibold">{item.account.displayName} ({item.account.email})</p>
                      <p className="text-sm">Chiến dịch: {item.campaign.title}</p>
                      <p className="text-sm">Mission: {item.mission.title}</p>
                      <p className="text-sm">Trạng thái nhiệm vụ: {item.status}</p>
                      <p className="text-sm">Trạng thái sản phẩm: {item.productStatus}</p>
                      <p className="text-sm">Trạng thái cọc: {item.depositStatus}</p>
                      <p className="text-sm">Trạng thái hoàn tiền: {item.reimbursementStatus}</p>
                      <p className="text-sm">Link sản phẩm: {item.mission.productLink ?? "(chưa có)"}</p>
                      <p className="text-sm">Hóa đơn URL: {item.submission?.screenshotUrl ?? "-"}</p>
                      <p className="text-sm">Ghi chú mua hàng: {item.submission?.proofTextNote ?? "-"}</p>

                      {canConfirmDeposit ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button className="dc-btn-primary" onClick={() => void decideCreatorMission(item.id, "CONFIRM_DEPOSIT_AND_PRODUCT_RECEIVED")}>
                            Xác nhận cọc + nhận sản phẩm
                          </button>
                        </div>
                      ) : null}

                      {canReviewPurchaseProof ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button className="dc-btn-primary" onClick={() => void decideCreatorMission(item.id, "APPROVE_PURCHASE_PROOF")}>Duyệt bằng chứng mua hàng</button>
                          <button className="dc-btn-secondary" onClick={() => void decideCreatorMission(item.id, "REJECT_PURCHASE_PROOF")}>Từ chối bằng chứng</button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-bold">Duyệt hoàn tiền + cộng điểm nhiệm vụ</h2>
            {payoutQueue.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-600">Không có báo cáo cần duyệt hoàn tiền/cộng điểm theo bộ lọc hiện tại.</p>
            ) : (
              <div className="mt-3 grid gap-3">
                {payoutQueue.map((item) => (
                  <article key={item.id} className="dc-card p-4">
                    <p className="font-semibold">{item.account.displayName} ({item.account.email})</p>
                    <p className="text-sm">Chiến dịch: {item.campaign.title}</p>
                    <p className="text-sm">Mission: {item.mission.title}</p>
                    <p className="text-sm">Reward base: {item.mission.rewardPoints.toLocaleString("vi-VN")} N-Points</p>
                    <p className="text-sm">Link video public: {item.submission?.socialPostUrl ?? "-"}</p>
                    <p className="text-sm">Mã quảng cáo: {item.submission?.proofTextNote ?? "-"}</p>
                    <p className="text-sm">Hóa đơn URL: {item.submission?.screenshotUrl ?? "-"}</p>
                    <p className="text-sm">Ảnh đánh giá URL: {item.submission?.fileUploadUrl ?? "-"}</p>
                    <p className="text-sm">Ghi chú: {item.submission?.note ?? "-"}</p>
                    {item.publishFeedback ? <p className="mt-1 text-sm text-red-700">Feedback hiện tại: {item.publishFeedback}</p> : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="dc-btn-primary" onClick={() => void decideCreatorMission(item.id, "APPROVE_PUBLISH_REPORT")}>Duyệt + nhập tiền mua hàng</button>
                      <button className="dc-btn-secondary" onClick={() => void decideCreatorMission(item.id, "REJECT_PUBLISH_REPORT")}>Từ chối báo cáo</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}
