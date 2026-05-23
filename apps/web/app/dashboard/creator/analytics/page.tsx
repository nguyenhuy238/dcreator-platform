"use client";
import { useEffect, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { ErrorState, PageHeader, StatsCard } from "@/app/components/dcreator/ui/base";

export default function CreatorAnalyticsPage() {
  const [data, setData] = useState<{ proofApproved?: number; proofSubmitted?: number; commissionEarned?: number } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch('/api/creator/dashboard/analytics',{cache:'no-store'}).then(async r=>{const p=await r.json(); if(!r.ok||!p.success) throw new Error(p.error??'Không thể tải analytics'); setData(p.data as { proofApproved?: number; proofSubmitted?: number; commissionEarned?: number });}).catch((e:Error)=>setError(e.message)); }, []);
  return <><PublicHeader /><AppShell><PageHeader title="KPI / Analytics" subtitle="Thống kê hiệu suất Creator." />{error ? <ErrorState title="Không thể tải analytics" description={error} /> : null}{data ? <section className="dc-grid-dashboard"><StatsCard title="Proof đã nộp" value={`${data.proofSubmitted ?? 0}`} /><StatsCard title="Proof đã duyệt" value={`${data.proofApproved ?? 0}`} /><StatsCard title="Hoa hồng" value={`${(data.commissionEarned ?? 0).toLocaleString('vi-VN')}đ`} /></section> : null}</AppShell></>;
}
