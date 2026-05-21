"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { MissionCard, VoucherCard } from "@/app/components/dcreator/cards/campaign";
import { EmptyState, ErrorState, LoadingSkeleton, PageHeader, SectionHeader, StatsCard } from "@/app/components/dcreator/ui/base";

const nav = [
  { href: "/dashboard/user", label: "Tổng quan" },
  { href: "/campaigns", label: "Campaign" },
  { href: "/wallet", label: "Wallet" },
  { href: "/vouchers", label: "Voucher" },
  { href: "/me/missions", label: "Missions" }
];

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: string };
type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

type WalletMe = {
  wallet: { pointsBalance: number };
  transactions: Array<{ createdAt: string; pointsDelta: number; type: string; referenceType: string; referenceId: string | null }>;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletMe | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [missions, setMissions] = useState<MyMission[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/wallet/me", { cache: "no-store" }),
      fetch("/api/me/vouchers", { cache: "no-store" }),
      fetch("/api/me/missions", { cache: "no-store" })
    ])
      .then(async ([walletRes, voucherRes, missionRes]) => {
        const walletBody = (await walletRes.json()) as ApiResponse<WalletMe>;
        const voucherBody = (await voucherRes.json()) as ApiResponse<Voucher[]>;
        const missionBody = (await missionRes.json()) as ApiResponse<MyMission[]>;

        if (!walletRes.ok || !walletBody.success) throw new Error(walletBody.success ? "Load wallet failed" : walletBody.error);
        if (!voucherRes.ok || !voucherBody.success) throw new Error(voucherBody.success ? "Load vouchers failed" : voucherBody.error);
        if (!missionRes.ok || !missionBody.success) throw new Error(missionBody.success ? "Load missions failed" : missionBody.error);

        setWallet(walletBody.data);
        setVouchers(voucherBody.data);
        setMissions(missionBody.data);
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

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

  const supportedCampaignCount = useMemo(() => {
    if (!wallet) return 0;
    const supportIds = new Set(
      wallet.transactions
        .filter((item) => item.referenceType === "CAMPAIGN" && item.type === "SUPPORT")
        .map((item) => item.referenceId)
        .filter((item): item is string => Boolean(item))
    );
    return supportIds.size;
  }, [wallet]);

  const activeVoucherCount = useMemo(
    () => vouchers.filter((item) => item.status === "ACTIVE" || item.status === "ISSUED").length,
    [vouchers]
  );

  return <><PublicHeader /><AppShell sidebarItems={nav}><PageHeader title="User Dashboard" subtitle="Theo dõi ủng hộ, voucher, mission và số dư N-Points." action={<Link className="dc-btn-primary" href="/campaigns">Khám phá campaign</Link>} />{error ? <ErrorState title="Không thể tải dashboard" description={error} /> : null}{loading ? <LoadingSkeleton rows={4} /> : <section className="dc-grid-dashboard"><StatsCard title="N-Points" value={`${wallet?.wallet.pointsBalance.toLocaleString("vi-VN") ?? "0"}`} hint={`+${weeklyPoints.toLocaleString("vi-VN")} tuần này`} /><StatsCard title="Campaign đã ủng hộ" value={`${supportedCampaignCount}`} /><StatsCard title="Voucher đang có" value={`${activeVoucherCount}`} /><StatsCard title="Mission tham gia" value={`${missions.length}`} /></section>}<section className="mt-8"><SectionHeader title="My Vouchers" action={<Link href="/vouchers" className="dc-btn-secondary">Xem tất cả</Link>} />{loading ? <LoadingSkeleton rows={2} /> : vouchers.length === 0 ? <EmptyState title="Chưa có voucher" description="Tham gia campaign hoặc mission để nhận voucher." action={<Link href="/campaigns" className="dc-btn-primary">Khám phá campaign</Link>} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{vouchers.slice(0, 6).map((item) => <VoucherCard key={item.id} code={item.voucherCode} status={voucherStatusLabel[item.status]} expiry={formatDate(item.expiryAt)} />)}</div>}</section><section className="mt-8"><SectionHeader title="My Missions" action={<Link href="/me/missions" className="dc-btn-secondary">Xem tất cả</Link>} />{loading ? <LoadingSkeleton rows={2} /> : missions.length === 0 ? <EmptyState title="Chưa có mission" description="Bạn chưa tham gia mission nào." action={<Link href="/missions" className="dc-btn-primary">Tìm mission</Link>} /> : <div className="grid gap-4 md:grid-cols-2">{missions.slice(0, 6).map((item) => <MissionCard key={item.id} title={item.mission.title} status={item.lifecycleStatus.toLowerCase()} reward={`${item.mission.rewardPoints.toLocaleString("vi-VN")} N-Points`} due={formatDate(item.mission.deadlineAt)} />)}</div>}</section></AppShell></>;
}
