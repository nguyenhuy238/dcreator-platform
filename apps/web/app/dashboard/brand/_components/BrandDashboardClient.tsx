"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ActionToast,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  SectionHeader,
  StatsCard,
  StatusBadge
} from "@/app/components/dcreator/ui/base";

type ApiResult<T> = { success: boolean; data: T; error?: string };

async function load<T>(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const payload = (await res.json()) as ApiResult<T>;
  if (!res.ok || !payload.success) throw new Error(payload.error ?? "Tải dữ liệu thất bại");
  return payload.data;
}

export function BrandDashboardClient() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [overview, profile, campaigns, applications, proofs, budget, analytics] = await Promise.all([
        load("/api/brand/dashboard/overview"),
        load("/api/brand/dashboard/profile"),
        load("/api/brand/dashboard/campaigns"),
        load("/api/brand/dashboard/creator-applications"),
        load("/api/brand/dashboard/proofs"),
        load("/api/brand/dashboard/budget"),
        load("/api/brand/dashboard/analytics")
      ]);
      setData({ overview, profile, campaigns, applications, proofs, budget, analytics });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải dữ liệu thất bại");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function postJson(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = (await res.json()) as ApiResult<unknown>;
    setMessage(res.ok && payload.success ? "Thành công" : payload.error ?? "Failed");
    if (res.ok && payload.success) await refresh();
  }

  if (loading) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorState title="Không thể tải Brand Dashboard" description={error} onRetry={() => void refresh()} />;

  const overview = data.overview as { activeCampaigns: number; totalBudget: number; prepaidFundBalance: number; totalCreators: number; totalVideosSubmitted: number; totalSalesConversions: number };
  const profile = data.profile as { brandName: string; logoUrl: string; businessInfo: string; verificationStatus: string };
  const campaigns = data.campaigns as Array<{ id: string; title: string; status: string }>;
  const applications = data.applications as Array<{
    id: string;
    account: {
      displayName: string;
      creatorProfile: { mainPlatform: string; socialUrl: string; followerCount: number | null } | null;
    };
    mission: { title: string };
  }>;
  const proofs = data.proofs as Array<{ id: string; account: { displayName: string }; mission: { title: string }; videoUrl: string | null }>;
  const budget = data.budget as { prepaidFundBalance: number; transactionHistory: Array<{ id: string; type: string; pointsDelta: number }> };
  const analytics = data.analytics as {
    campaignPerformance: Array<{ id: string; title: string; fundedAmountVnd: number }>;
    topCreator: { displayName: string } | null;
    topProduct: { title: string } | null;
    voucherRedemption: number;
    conversionRate: number;
    kpis?: {
      campaignViews: number;
      ctaRate: number;
      contributionConversion: number;
      totalFundedVnd: number;
      topCreator: { displayName: string } | null;
      rewardClaimRate: number;
      voucherRedemptionRate: number;
    };
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bảng điều khiển Nhãn hàng"
        subtitle="Theo dõi campaign, creator application, proof review và vận hành Brand."
        action={<Link href="/dashboard/brand/campaign-setup" className="dc-btn-primary">Yêu cầu Admin tạo campaign</Link>}
      />
      {searchParams.get("created") === "1" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <p className="font-semibold">Brand đã được tạo</p>
          <p>Bạn có thể bắt đầu thiết lập sản phẩm/campaign.</p>
        </div>
      ) : null}
      {message ? <ActionToast message={message === "Thành công" ? "Cập nhật thành công" : message} /> : null}
      <section>
        <div className="dc-grid-dashboard">
          <StatsCard title="Campaign đang chạy" value={`${overview?.activeCampaigns ?? 0}`} />
          <StatsCard title="Tổng ngân sách" value={`${(overview?.totalBudget ?? 0).toLocaleString("vi-VN")} VND`} />
          <StatsCard title="Quỹ prepaid" value={`${(overview?.prepaidFundBalance ?? 0).toLocaleString("vi-VN")} VND`} />
          <StatsCard title="Creator tham gia" value={`${overview?.totalCreators ?? 0}`} />
        </div>
      </section>

      <section>
        <SectionHeader title="Hồ sơ thương hiệu" action={<Link href="/dashboard/brand/profile" className="dc-btn-secondary">Cập nhật hồ sơ</Link>} />
        {!profile ? <EmptyState title="Chưa có hồ sơ brand" description="Hoàn thiện thông tin để gửi duyệt." /> : (
          <article className="dc-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500">Tên thương hiệu</p>
                <p className="text-lg font-bold text-zinc-900">{profile.brandName || "Không có"}</p>
              </div>
              <StatusBadge status={String(profile.verificationStatus).toLowerCase()} />
            </div>
            {String(profile.verificationStatus).toUpperCase() !== "ACTIVE" ? (
              <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Chưa xác minh: Xác minh giúp mở khóa payout/campaign nâng cao
              </p>
            ) : null}
            <p className="mt-2 text-sm text-zinc-600">Thông tin: {profile.businessInfo || "Không có"}</p>
          </article>
        )}
      </section>

      <section>
        <SectionHeader title="Quản lý campaign" action={<Link href="/brand" className="dc-btn-secondary">Xem campaign public</Link>} />
        {campaigns?.length ? (
          <div className="grid gap-3">
            {campaigns.map((c) => (
              <article key={c.id} className="dc-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-zinc-900">{c.title}</p>
                  <StatusBadge status={c.status.toLowerCase()} />
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyState title="Chưa có campaign" description="Gửi yêu cầu để Admin tạo campaign/job cho brand." />}
      </section>

      <section>
        <SectionHeader title="Reward / voucher" subtitle="Thiết lập reward theo campaign bằng dữ liệu thật." />
        <div className="dc-card p-4">
          <p className="text-sm text-zinc-600">
            Tạo reward/voucher tại màn hình campaign setup để đồng bộ vận hành chiến dịch.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/dashboard/brand/campaign-setup" className="dc-btn-primary">Thiết lập campaign</Link>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="Đơn ứng tuyển Creator" subtitle="Duyệt Creator apply vào campaign/job." />
        {applications?.length ? (
          <div className="grid gap-3">
            {applications.slice(0, 8).map((a) => (
              <article key={a.id} className="dc-card p-4">
                <p className="font-semibold text-zinc-900">{a.account.displayName} - {a.mission.title}</p>
                <p className="mt-1 text-sm text-zinc-600">
                  {a.account.creatorProfile
                    ? `${a.account.creatorProfile.mainPlatform} | Followers: ${a.account.creatorProfile.followerCount ?? 0}`
                    : "Chưa có hồ sơ Creator"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="dc-btn-primary" onClick={() => postJson("/api/brand/dashboard/creator-applications", { submissionId: a.id, decision: "APPROVED" })}>Duyệt</button>
                  <button className="dc-btn-secondary" onClick={() => postJson("/api/brand/dashboard/creator-applications", { submissionId: a.id, decision: "REJECTED", note: "Chưa phù hợp campaign" })}>Từ chối</button>
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyState title="Không có creator application" description="Danh sách apply mới sẽ hiển thị tại đây." />}
      </section>

      <section>
        <SectionHeader title="Duyệt proof/video" subtitle="Duyệt proof/video Creator nộp." />
        {proofs?.length ? (
          <div className="grid gap-3">
            {proofs.slice(0, 8).map((p) => (
              <article key={p.id} className="dc-card p-4">
                <p className="font-semibold text-zinc-900">{p.account.displayName} - {p.mission.title}</p>
                <p className="mt-1 break-all text-sm text-zinc-600">{p.videoUrl || "Chưa có link video"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="dc-btn-primary" onClick={() => postJson("/api/brand/dashboard/proofs", { submissionId: p.id, decision: "APPROVED" })}>Duyệt proof</button>
                  <button className="dc-btn-secondary" onClick={() => postJson("/api/brand/dashboard/proofs", { submissionId: p.id, decision: "REVISION", rejectReason: "Cần chỉnh sửa nội dung theo brief" })}>Yêu cầu sửa</button>
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyState title="Không có proof cần duyệt" description="Proof pending sẽ xuất hiện ở đây." />}
      </section>

      <section>
        <SectionHeader title="Quỹ prepaid / giao dịch" action={<Link href="/wallet" className="dc-btn-secondary">Đi tới ví</Link>} />
        <div className="dc-card p-4">
          <p className="text-sm text-zinc-600">
            Số dư quỹ hiện tại: <span className="font-semibold text-zinc-900">{(budget?.prepaidFundBalance ?? 0).toLocaleString("vi-VN")} VND</span>
          </p>
          {budget?.transactionHistory?.length ? (
            <div className="mt-3 grid gap-2">
              {budget.transactionHistory.slice(0, 8).map((t) => (
                <div key={t.id} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                  {t.type}: {t.pointsDelta.toLocaleString("vi-VN")}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">Không có transaction.</p>
          )}
        </div>
      </section>

      <section>
        <SectionHeader title="KPI / Analytics" />
        <div className="dc-grid-dashboard">
          <StatsCard title="Lượt xem campaign" value={`${analytics?.kpis?.campaignViews ?? 0}`} />
          <StatsCard title="Tỷ lệ CTA" value={`${analytics?.kpis?.ctaRate ?? 0}%`} />
          <StatsCard title="Tỷ lệ chuyển đổi ủng hộ" value={`${analytics?.kpis?.contributionConversion ?? 0}%`} />
          <StatsCard title="Tỷ lệ redeem voucher" value={`${analytics?.kpis?.voucherRedemptionRate ?? 0}%`} />
        </div>
        <div className="mt-4 grid gap-3">
          {analytics?.campaignPerformance?.length ? analytics.campaignPerformance.map((c) => (
            <article key={c.id} className="dc-card p-4">
              <p className="font-semibold text-zinc-900">{c.title}</p>
              <p className="text-sm text-zinc-600">Đã huy động: {c.fundedAmountVnd.toLocaleString("vi-VN")} VND</p>
            </article>
          )) : <EmptyState title="Chưa có dữ liệu KPI chi tiết" description="Dữ liệu analytics sẽ tăng theo hoạt động campaign." />}
        </div>
      </section>
    </div>
  );
}
