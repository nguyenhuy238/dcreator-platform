"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/app/components/dcreator/layout/shell";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  SectionHeader,
  StatsCard
} from "@/app/components/dcreator/ui/base";
import { MissionCard, VoucherCard } from "@/app/components/dcreator/cards/campaign";
import { getNavItemsForWorkspace } from "@/lib/navigation";

const nav = getNavItemsForWorkspace("user", ["USER", "CREATOR", "BRAND_OWNER", "BRAND_STAFF", "ADMIN", "OPS"]);

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

export default function UserDashboardPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletMe | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [missions, setMissions] = useState<MyMission[]>([]);

  useEffect(() => {
    let active = true;
    const denied = searchParams.get("denied");
    if (denied) setError(denied);
    Promise.all([
      fetch("/api/wallet/me", { cache: "no-store" }),
      fetch("/api/me/vouchers", { cache: "no-store" }),
      fetch("/api/me/missions", { cache: "no-store" })
    ])
      .then(async ([walletRes, voucherRes, missionRes]) => {
        const walletBody = (await walletRes.json()) as ApiResponse<WalletMe>;
        const voucherBody = (await voucherRes.json()) as ApiResponse<Voucher[]>;
        const missionBody = (await missionRes.json()) as ApiResponse<MyMission[]>;

        if (!walletRes.ok || !walletBody.success) {
          throw new Error(walletBody.success ? "Tải ví thất bại" : walletBody.error);
        }
        if (!voucherRes.ok || !voucherBody.success) {
          throw new Error(voucherBody.success ? "Tải voucher thất bại" : voucherBody.error);
        }
        if (!missionRes.ok || !missionBody.success) {
          throw new Error(missionBody.success ? "Tải nhiệm vụ thất bại" : missionBody.error);
        }
        if (!active) return;
        setWallet(walletBody.data);
        setVouchers(voucherBody.data);
        setMissions(missionBody.data);
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [searchParams]);

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

  const activeVoucherCount = useMemo(
    () => vouchers.filter((item) => item.status === "ACTIVE" || item.status === "ISSUED").length,
    [vouchers]
  );

  return (
    <>
      <AppShell sidebarItems={nav}>
        <PageHeader
          title="Dashboard Người dùng"
          subtitle="Theo dõi ủng hộ, voucher, mission và số dư N-Points."
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
            <StatsCard title="Voucher đang có" value={`${activeVoucherCount}`} />
            <StatsCard title="Mission tham gia" value={`${missions.length}`} />
          </section>
        )}

        <section className="mt-8">
          <SectionHeader
            title="Voucher đã nhận"
            action={
              <Link href="/dashboard/user/vouchers" className="dc-btn-secondary">
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
            title="Trò chơi nhiệm vụ đã tham gia"
            action={
              <Link href="/dashboard/user/missions" className="dc-btn-secondary">
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
                <Link href="/dashboard/user/missions" className="dc-btn-primary">
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
