"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Role } from "@prisma/client";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  SectionHeader,
  StatsCard
} from "@/app/components/dcreator/ui/base";
import { MissionCard, VoucherCard } from "@/app/components/dcreator/cards/campaign";
import { getDefaultDashboardPath } from "@/lib/auth/dashboard-access";

const nav = [
  { href: "/dashboard/user", label: "Tổng quan" },
  { href: "/dashboard/user/profile", label: "Hồ sơ người dùng" },
  { href: "/campaigns", label: "Chiến dịch" },
  { href: "/wallet", label: "Ví" },
  { href: "/vouchers", label: "Voucher" },
  { href: "/me/missions", label: "Nhiệm vụ" }
];

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: string };
type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

type WalletMe = {
  wallet: { pointsBalance: number };
  transactions: Array<{ createdAt: string; pointsDelta: number }>;
};

type Voucher = {
  id: string;
  voucherCode: string;
  status: "ISSUED" | "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";
  expiryAt: string | null;
};

type MyMission = {
  id: string;
  lifecycleStatus: string;
  mission: { title: string; rewardPoints: number; deadlineAt: string | null };
};

type MyContribution = {
  id: string;
  amountVnd: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  createdAt: string;
  paymentMethod: "N_POINTS" | "PAYOS";
  campaign: { id: string; title: string; slug: string };
  reward: { id: string; title: string } | null;
  rewardClaim: { voucherCode: string } | null;
};

const voucherStatusLabel: Record<Voucher["status"], string> = {
  ISSUED: "active",
  ACTIVE: "active",
  USED: "used",
  EXPIRED: "expired",
  CANCELLED: "cancelled"
};

function formatDate(value: string | null) {
  if (!value) return "Không giới hạn";
  return new Date(value).toLocaleDateString("vi-VN");
}

function contributionStatusLabel(status: MyContribution["status"]) {
  if (status === "SUCCESS") return "Thành công";
  if (status === "PENDING") return "Đang chờ";
  return "Thất bại";
}

export default function UserDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletMe | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [missions, setMissions] = useState<MyMission[]>([]);
  const [contributions, setContributions] = useState<MyContribution[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!active || !response.ok || !payload?.success) return;
        const roles = payload.data?.user?.roles as Role[] | undefined;
        if (!Array.isArray(roles)) return;
        const defaultDashboard = getDefaultDashboardPath(roles);
        if (defaultDashboard !== "/dashboard/user") router.replace(defaultDashboard);
      })
      .catch(() => {});

    Promise.all([
      fetch("/api/wallet/me", { cache: "no-store" }),
      fetch("/api/me/vouchers", { cache: "no-store" }),
      fetch("/api/me/missions", { cache: "no-store" }),
      fetch("/api/me/contributions", { cache: "no-store" })
    ])
      .then(async ([walletRes, voucherRes, missionRes, contributionRes]) => {
        const walletBody = (await walletRes.json()) as ApiResponse<WalletMe>;
        const voucherBody = (await voucherRes.json()) as ApiResponse<Voucher[]>;
        const missionBody = (await missionRes.json()) as ApiResponse<MyMission[]>;
        const contributionBody = (await contributionRes.json()) as ApiResponse<MyContribution[]>;

        if (!walletRes.ok || !walletBody.success) {
          throw new Error(walletBody.success ? "Tải ví thất bại" : walletBody.error);
        }
        if (!voucherRes.ok || !voucherBody.success) {
          throw new Error(voucherBody.success ? "Tải voucher thất bại" : voucherBody.error);
        }
        if (!missionRes.ok || !missionBody.success) {
          throw new Error(missionBody.success ? "Tải nhiệm vụ thất bại" : missionBody.error);
        }
        if (!contributionRes.ok || !contributionBody.success) {
          throw new Error(contributionBody.success ? "Tải lượt ủng hộ thất bại" : contributionBody.error);
        }

        setWallet(walletBody.data);
        setVouchers(voucherBody.data);
        setMissions(missionBody.data);
        setContributions(contributionBody.data);
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));

    return () => {
      active = false;
    };
  }, [router]);

  const weeklyPoints = useMemo(() => {
    if (!wallet) return 0;
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return wallet.transactions
      .filter((item) => {
        const createdAt = new Date(item.createdAt).getTime();
        return now - createdAt <= sevenDays && item.pointsDelta > 0;
      })
      .reduce((sum, item) => sum + item.pointsDelta, 0);
  }, [wallet]);

  const successfulContributionCount = useMemo(
    () => contributions.filter((item) => item.status === "SUCCESS").length,
    [contributions]
  );

  const activeVoucherCount = useMemo(
    () => vouchers.filter((item) => item.status === "ACTIVE" || item.status === "ISSUED").length,
    [vouchers]
  );

  return (
    <>
      <PublicHeader />
      <AppShell sidebarItems={nav}>
        <PageHeader
          title="Dashboard Người dùng"
          subtitle="Theo dõi ủng hộ, voucher, mission và số dư N-Points."
          action={
            <Link className="dc-btn-primary" href="/campaigns">
              Ủng hộ campaign
            </Link>
          }
        />

        {error ? <ErrorState title="Không thể tải dashboard" description={error} /> : null}

        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : (
          <section className="dc-grid-dashboard">
            <StatsCard
              title="N-Points"
              value={`${wallet?.wallet.pointsBalance.toLocaleString("vi-VN") ?? "0"}`}
              hint={`+${weeklyPoints.toLocaleString("vi-VN")} tuần này`}
            />
            <StatsCard title="Lượt ủng hộ thành công" value={`${successfulContributionCount}`} />
            <StatsCard title="Voucher đang có" value={`${activeVoucherCount}`} />
            <StatsCard title="Mission tham gia" value={`${missions.length}`} />
          </section>
        )}

        <section className="mt-8">
          <SectionHeader
            title="Lịch sử ủng hộ"
            subtitle="Các campaign bạn đã ủng hộ"
            action={
              <Link href="/campaigns" className="dc-btn-secondary">
                Ủng hộ thêm
              </Link>
            }
          />
          {loading ? (
            <LoadingSkeleton rows={2} />
          ) : contributions.length === 0 ? (
            <EmptyState
              title="Chưa có lượt ủng hộ"
              description="Hãy chọn campaign phù hợp và bắt đầu ủng hộ."
              action={
                <Link href="/campaigns" className="dc-btn-primary">
                  Ủng hộ ngay
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {contributions.slice(0, 6).map((item) => (
                <article key={item.id} className="dc-card p-4">
                  <p className="text-sm text-zinc-500">{new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                  <p className="mt-1 text-base font-semibold text-zinc-900">{item.campaign.title}</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    Số tiền: {item.amountVnd.toLocaleString("vi-VN")} VND
                  </p>
                  <p className="text-sm text-zinc-600">Thanh toán: {item.paymentMethod}</p>
                  <p className="text-sm text-zinc-600">Trạng thái: {contributionStatusLabel(item.status)}</p>
                  {item.reward ? <p className="text-sm text-zinc-600">Phần thưởng: {item.reward.title}</p> : null}
                  {item.rewardClaim ? (
                    <p className="text-sm text-emerald-700">Voucher: {item.rewardClaim.voucherCode}</p>
                  ) : null}
                  <div className="mt-3">
                    <Link href={`/campaigns/${item.campaign.slug}`} className="dc-btn-secondary">
                      Xem campaign
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <SectionHeader
            title="Voucher đã nhận"
            action={
              <Link href="/vouchers" className="dc-btn-secondary">
                Nhận voucher
              </Link>
            }
          />
          {loading ? (
            <LoadingSkeleton rows={2} />
          ) : vouchers.length === 0 ? (
            <EmptyState
              title="Chưa có voucher"
              description="Tham gia campaign hoặc mission để nhận voucher."
              action={
                <Link href="/campaigns" className="dc-btn-primary">
                  Chọn reward
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {vouchers.slice(0, 6).map((item) => (
                <VoucherCard
                  key={item.id}
                  code={item.voucherCode}
                  status={voucherStatusLabel[item.status]}
                  expiry={formatDate(item.expiryAt)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <SectionHeader
            title="Mission đã tham gia"
            action={
              <Link href="/me/missions" className="dc-btn-secondary">
                Xem tất cả
              </Link>
            }
          />
          {loading ? (
            <LoadingSkeleton rows={2} />
          ) : missions.length === 0 ? (
            <EmptyState
              title="Chưa có mission"
              description="Bạn chưa tham gia mission nào."
              action={
                <Link href="/missions" className="dc-btn-primary">
                  Tham gia mission
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {missions.slice(0, 6).map((item) => (
                <MissionCard
                  key={item.id}
                  title={item.mission.title}
                  status={item.lifecycleStatus.toLowerCase()}
                  reward={`${item.mission.rewardPoints.toLocaleString("vi-VN")} N-Points`}
                  due={formatDate(item.mission.deadlineAt)}
                />
              ))}
            </div>
          )}
        </section>
      </AppShell>
    </>
  );
}
