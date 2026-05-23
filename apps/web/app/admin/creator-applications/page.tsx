"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  status: string;
  displayName: string;
  socialUrl: string;
  rejectReason: string | null;
  account: { email: string; displayName: string };
};

type CampaignApplicationItem = {
  id: string;
  lifecycleStatus: "ACCEPTED" | "DOING" | "REJECTED" | string;
  rejectReason: string | null;
  account: {
    email: string;
    displayName: string;
    creatorProfile: {
      mainPlatform: string;
      socialUrl: string;
      followerCount: number | null;
    } | null;
  };
  mission: {
    title: string;
    audience: string;
    campaign: { title: string; slug: string };
  };
};

type CreatorMissionAdminItem = {
  id: string;
  status: "PRODUCT_PENDING" | "DRAFT_PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | string;
  productReceiveOption: "DEPOSIT_PRODUCT" | "CREATOR_BUY_FIRST" | "NO_PRODUCT_REQUIRED" | string;
  productStatus: "NOT_REQUIRED" | "WAITING_DEPOSIT" | "WAITING_PURCHASE" | "RECEIVED" | string;
  depositStatus: "NOT_REQUIRED" | "PENDING" | "PAID" | "REFUND_PENDING" | "REFUNDED" | string;
  reimbursementStatus: "NOT_REQUIRED" | "PENDING" | "PURCHASE_SUBMITTED" | "APPROVED" | "PAYOUT_PENDING" | "PAID" | "REJECTED" | string;
  videoReviewStatus: "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED" | string;
  videoReviewFeedback: string | null;
  publishStatus: "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED" | string;
  publishFeedback: string | null;
  mission: {
    title: string;
    productLink: string | null;
    rewardPoints: number;
  };
  submission: {
    videoUrl: string | null;
    socialPostUrl: string | null;
    proofTextNote: string | null;
    screenshotUrl: string | null;
    fileUploadUrl: string | null;
    note: string | null;
  } | null;
  account: {
    displayName: string;
    email: string;
  };
  campaign: {
    title: string;
    slug: string;
  };
};

const statusLabelVi: Record<string, string> = {
  PRODUCT_PENDING: "Chờ xử lý sản phẩm",
  DRAFT_PENDING: "Chờ gửi video review",
  IN_PROGRESS: "Đang xử lý nội dung",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  NOT_REQUIRED: "Không áp dụng",
  WAITING_DEPOSIT: "Chờ cọc",
  WAITING_PURCHASE: "Chờ mua hàng",
  RECEIVED: "Đã xác nhận mua",
  PENDING: "Đang chờ",
  PAID: "Đã thanh toán",
  REFUND_PENDING: "Chờ hoàn cọc",
  REFUNDED: "Đã hoàn cọc",
  PURCHASE_SUBMITTED: "Đã gửi bằng chứng mua",
  APPROVED: "Đã duyệt",
  PAYOUT_PENDING: "Chờ chi trả",
  REJECTED: "Từ chối",
  DEPOSIT_PRODUCT: "Cọc sản phẩm",
  CREATOR_BUY_FIRST: "Creator tự mua trước",
  NO_PRODUCT_REQUIRED: "Không cần sản phẩm",
  NOT_SUBMITTED: "Chưa gửi"
};

function vi(value: string) {
  return statusLabelVi[value] ?? value;
}

export default function CreatorApplicationsAdminPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [campaignItems, setCampaignItems] = useState<CampaignApplicationItem[]>([]);
  const [creatorMissionItems, setCreatorMissionItems] = useState<CreatorMissionAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [campaignStatus, setCampaignStatus] = useState("ACCEPTED");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const creatorParams = new URLSearchParams();
      if (status) creatorParams.set("status", status);
      if (query.trim()) creatorParams.set("query", query.trim());

      const campaignParams = new URLSearchParams();
      if (campaignStatus) campaignParams.set("status", campaignStatus);
      if (query.trim()) campaignParams.set("query", query.trim());

      const [creatorRes, campaignRes, creatorMissionRes] = await Promise.all([
        fetch(`/api/admin/dashboard/creator-applications?${creatorParams.toString()}`, { cache: "no-store" }),
        fetch(`/api/admin/dashboard/creator-campaign-applications?${campaignParams.toString()}`, { cache: "no-store" }),
        fetch("/api/admin/dashboard/creator-missions", { cache: "no-store" })
      ]);

      const creatorBody = await creatorRes.json();
      const campaignBody = await campaignRes.json();
      const creatorMissionBody = await creatorMissionRes.json();

      if (!creatorRes.ok || !creatorBody.success) {
        throw new Error(creatorBody.error ?? "Không thể tải hồ sơ Creator");
      }
      if (!campaignRes.ok || !campaignBody.success) {
        throw new Error(campaignBody.error ?? "Không thể tải đơn ứng tuyển campaign");
      }
      if (!creatorMissionRes.ok || !creatorMissionBody.success) {
        throw new Error(creatorMissionBody.error ?? "Không thể tải workflow Creator Mission");
      }

      setItems(creatorBody.data as Item[]);
      setCampaignItems(campaignBody.data as CampaignApplicationItem[]);
      setCreatorMissionItems(creatorMissionBody.data as CreatorMissionAdminItem[]);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Tải dữ liệu thất bại");
    } finally {
      setLoading(false);
    }
  }, [campaignStatus, query, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: "APPROVED" | "REJECTED" | "NEEDS_REVISION") {
    let rejectReason: string | undefined;
    if (decision !== "APPROVED") {
      rejectReason = window.prompt("Nhập lý do (>=10 ký tự):", "Thiếu thông tin hồ sơ") ?? "";
      if (!rejectReason || rejectReason.trim().length < 10) return;
    }
    const res = await fetch(`/api/admin/dashboard/creator-applications/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: decision, rejectReason })
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      setError(body.error ?? "Thao tác thất bại");
      return;
    }
    await load();
  }

  async function decideCampaignApplication(id: string, decision: "APPROVED" | "REJECTED") {
    let rejectReason: string | undefined;
    if (decision === "REJECTED") {
      rejectReason = window.prompt("Nhập lý do từ chối (>=10 ký tự):", "Chưa phù hợp tiêu chí campaign") ?? "";
      if (!rejectReason || rejectReason.trim().length < 10) return;
    }

    const res = await fetch(`/api/admin/dashboard/creator-campaign-applications/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(decision === "REJECTED" ? { decision, rejectReason } : { decision })
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      setError(body.error ?? "Duyệt đơn campaign thất bại");
      return;
    }

    await load();
  }

  async function decideCreatorMission(
    id: string,
    action:
      | "CONFIRM_DEPOSIT_AND_PRODUCT_RECEIVED"
      | "APPROVE_PURCHASE_PROOF"
      | "REJECT_PURCHASE_PROOF"
      | "APPROVE_VIDEO_REVIEW"
      | "REJECT_VIDEO_REVIEW"
      | "APPROVE_PUBLISH_REPORT"
      | "REJECT_PUBLISH_REPORT"
  ) {
    let reason: string | undefined;
    let purchaseAmountVnd: number | undefined;

    if (action === "REJECT_PURCHASE_PROOF" || action === "REJECT_VIDEO_REVIEW" || action === "REJECT_PUBLISH_REPORT") {
      reason = window.prompt("Nhập lý do từ chối:", "Nội dung chưa đạt yêu cầu")?.trim();
      if (!reason) return;
    }

    if (action === "APPROVE_PUBLISH_REPORT") {
      const input = window.prompt("Nhập số tiền mua hàng (VND) để quy đổi N-Points:", "0")?.trim();
      if (!input) return;
      const parsed = Number(input);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("Số tiền mua hàng không hợp lệ");
        return;
      }
      purchaseAmountVnd = Math.floor(parsed);
    }

    const res = await fetch(`/api/admin/dashboard/creator-missions/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason, purchaseAmountVnd })
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      setError(body.error ?? "Thao tác Creator Mission thất bại");
      return;
    }

    await load();
  }

  const actionableCreatorMissions = useMemo(
    () => creatorMissionItems.filter((item) => item.status === "PRODUCT_PENDING" || item.reimbursementStatus === "PURCHASE_SUBMITTED"),
    [creatorMissionItems]
  );

  const videoReviewQueue = useMemo(() => creatorMissionItems.filter((item) => item.videoReviewStatus === "PENDING"), [creatorMissionItems]);
  const publishQueue = useMemo(() => creatorMissionItems.filter((item) => item.publishStatus === "PENDING"), [creatorMissionItems]);

  return (
    <main>
      <h1 className="text-2xl font-black">Quản lý hồ sơ Creator</h1>

      <section className="mt-6">
        <h2 className="text-xl font-bold">Creator Missions - Xử lý sản phẩm</h2>
        <p className="mt-1 text-sm text-zinc-600">Xử lý cọc sản phẩm hoặc bằng chứng mua hàng (nếu có).</p>
        <div className="mt-4 grid gap-3">
          {actionableCreatorMissions.map((item) => {
            const canConfirmDeposit =
              item.productReceiveOption === "DEPOSIT_PRODUCT" &&
              item.productStatus === "WAITING_DEPOSIT" &&
              item.depositStatus === "PENDING";

            const canReviewPurchase =
              item.productReceiveOption === "CREATOR_BUY_FIRST" && item.reimbursementStatus === "PURCHASE_SUBMITTED";

            return (
              <article key={item.id} className="dc-card p-4">
                <p className="font-semibold">{item.account.displayName} ({item.account.email})</p>
                <p className="text-sm">Chiến dịch: {item.campaign.title}</p>
                <p className="text-sm">Mission: {item.mission.title}</p>
                <p className="text-sm">Option: {vi(item.productReceiveOption)}</p>
                <p className="text-sm">Trạng thái nhiệm vụ: {vi(item.status)}</p>
                <p className="text-sm">Trạng thái sản phẩm: {vi(item.productStatus)}</p>
                <p className="text-sm">Trạng thái cọc: {vi(item.depositStatus)}</p>
                <p className="text-sm">Trạng thái hoàn tiền: {vi(item.reimbursementStatus)}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {canConfirmDeposit ? (
                    <button className="dc-btn-primary" onClick={() => void decideCreatorMission(item.id, "CONFIRM_DEPOSIT_AND_PRODUCT_RECEIVED")}>
                      Xác nhận đã cọc / đã giao sản phẩm
                    </button>
                  ) : null}

                  {canReviewPurchase ? (
                    <>
                      <button className="dc-btn-primary" onClick={() => void decideCreatorMission(item.id, "APPROVE_PURCHASE_PROOF")}>
                        Duyệt bằng chứng mua hàng
                      </button>
                      <button className="dc-btn-secondary" onClick={() => void decideCreatorMission(item.id, "REJECT_PURCHASE_PROOF")}>
                        Từ chối bằng chứng mua hàng
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
          {actionableCreatorMissions.length === 0 ? <p className="text-sm text-zinc-600">Không có Creator Mission cần xử lý sản phẩm.</p> : null}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Creator Missions - Duyệt video review</h2>
        <p className="mt-1 text-sm text-zinc-600">Duyệt video review Creator đã gửi.</p>
        <div className="mt-4 grid gap-3">
          {videoReviewQueue.map((item) => (
            <article key={item.id} className="dc-card p-4">
              <p className="font-semibold">{item.account.displayName} ({item.account.email})</p>
              <p className="text-sm">Chiến dịch: {item.campaign.title}</p>
              <p className="text-sm">Mission: {item.mission.title}</p>
              <p className="text-sm">Reward: {item.mission.rewardPoints.toLocaleString("vi-VN")} N-Points</p>
              {item.submission?.videoUrl ? <p className="text-sm">Video review URL: {item.submission.videoUrl}</p> : <p className="text-sm text-amber-700">Chưa có video URL</p>}
              {item.submission?.note ? <p className="text-sm">Ghi chú Creator: {item.submission.note}</p> : null}
              <div className="mt-3 flex gap-2">
                <button className="dc-btn-primary" onClick={() => void decideCreatorMission(item.id, "APPROVE_VIDEO_REVIEW")}>Duyệt video</button>
                <button className="dc-btn-secondary" onClick={() => void decideCreatorMission(item.id, "REJECT_VIDEO_REVIEW")}>Từ chối video</button>
              </div>
            </article>
          ))}
          {videoReviewQueue.length === 0 ? <p className="text-sm text-zinc-600">Không có video review đang chờ duyệt.</p> : null}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Creator Missions - Duyệt báo cáo đăng bài</h2>
        <p className="mt-1 text-sm text-zinc-600">Duyệt link đăng bài, mã quảng cáo, hóa đơn và ảnh đánh giá 5*.</p>
        <div className="mt-4 grid gap-3">
          {publishQueue.map((item) => (
            <article key={item.id} className="dc-card p-4">
              <p className="font-semibold">{item.account.displayName} ({item.account.email})</p>
              <p className="text-sm">Chiến dịch: {item.campaign.title}</p>
              <p className="text-sm">Mission: {item.mission.title}</p>
              <p className="text-sm">Link sản phẩm: {item.mission.productLink ?? "(không cần sản phẩm)"}</p>
              <p className="text-sm">Link/ID video public: {item.submission?.socialPostUrl ?? "-"}</p>
              <p className="text-sm">Mã quảng cáo: {item.submission?.proofTextNote ?? "-"}</p>
              <p className="text-sm">Hóa đơn mua hàng URL: {item.submission?.screenshotUrl ?? "-"}</p>
              <p className="text-sm">Ảnh đánh giá 5* URL: {item.submission?.fileUploadUrl ?? "-"}</p>
              <p className="text-sm">Ghi chú thêm: {item.submission?.note ?? "-"}</p>
              <div className="mt-3 flex gap-2">
                <button className="dc-btn-primary" onClick={() => void decideCreatorMission(item.id, "APPROVE_PUBLISH_REPORT")}>Duyệt báo cáo + cộng điểm</button>
                <button className="dc-btn-secondary" onClick={() => void decideCreatorMission(item.id, "REJECT_PUBLISH_REPORT")}>Từ chối báo cáo</button>
              </div>
            </article>
          ))}
          {publishQueue.length === 0 ? <p className="text-sm text-zinc-600">Không có báo cáo đang chờ duyệt.</p> : null}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Đơn ứng tuyển chiến dịch</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <select className="dc-input max-w-56" value={campaignStatus} onChange={(e) => setCampaignStatus(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="ACCEPTED">ACCEPTED (Chờ duyệt)</option>
            <option value="DOING">DOING (Đã nhận nhiệm vụ)</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <button className="dc-btn-primary" onClick={() => void load()}>Lọc</button>
        </div>
        <div className="mt-4 grid gap-3">
          {campaignItems.map((item) => (
            <article key={item.id} className="dc-card p-4">
              <p className="font-semibold">{item.account.displayName} ({item.account.email})</p>
              <p className="text-sm">Chiến dịch: {item.mission.campaign.title}</p>
              <p className="text-sm">Mission: {item.mission.title} ({item.mission.audience})</p>
              <p className="text-sm">Trạng thái: {item.lifecycleStatus}</p>
              {item.account.creatorProfile ? (
                <p className="text-sm">
                  Hồ sơ: {item.account.creatorProfile.mainPlatform} - {item.account.creatorProfile.socialUrl} - Followers: {item.account.creatorProfile.followerCount ?? 0}
                </p>
              ) : (
                <p className="text-sm text-amber-700">Creator chưa có CreatorProfile.</p>
              )}
              {item.rejectReason ? <p className="text-sm text-red-700">Lý do từ chối: {item.rejectReason}</p> : null}
              <div className="mt-3 flex gap-2">
                <button className="dc-btn-primary" onClick={() => void decideCampaignApplication(item.id, "APPROVED")} disabled={item.lifecycleStatus === "DOING"}>
                  Duyệt
                </button>
                <button className="dc-btn-secondary" onClick={() => void decideCampaignApplication(item.id, "REJECTED")}>
                  Từ chối
                </button>
              </div>
            </article>
          ))}
          {campaignItems.length === 0 ? <p className="text-sm text-zinc-600">Không có đơn ứng tuyển campaign.</p> : null}
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        <select className="dc-input max-w-56" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả</option>
          <option value="PENDING_REVIEW">PENDING_REVIEW</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="NEEDS_REVISION">NEEDS_REVISION</option>
        </select>
        <input className="dc-input max-w-80" placeholder="Tìm theo email/tên/social" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="dc-btn-primary" onClick={() => void load()}>Lọc</button>
      </div>
      {loading ? <p className="mt-4">Đang tải...</p> : null}
      {error ? <p className="mt-4 text-red-700">{error}</p> : null}
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="dc-card p-4">
            <p className="font-semibold">{item.displayName} ({item.account.email})</p>
            <p className="text-sm">Kênh social: {item.socialUrl}</p>
            <p className="text-sm">Trạng thái: {item.status}</p>
            {item.rejectReason ? <p className="text-sm text-red-700">Lý do từ chối: {item.rejectReason}</p> : null}
            <div className="mt-3 flex gap-2">
              <button className="dc-btn-primary" onClick={() => void decide(item.id, "APPROVED")}>Duyệt</button>
              <button className="dc-btn-secondary" onClick={() => void decide(item.id, "REJECTED")}>Từ chối</button>
              <button className="dc-btn-secondary" onClick={() => void decide(item.id, "NEEDS_REVISION")}>Yêu cầu bổ sung</button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
