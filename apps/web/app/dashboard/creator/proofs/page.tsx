"use client";
import { useEffect, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, PageHeader } from "@/app/components/dcreator/ui/base";

type Analytics = { proofApproved?: number; proofSubmitted?: number; commissionEarned?: number };

export default function CreatorProofsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch('/api/creator/dashboard/analytics',{cache:'no-store'}).then(async r=>{const p=await r.json(); if(!r.ok||!p.success) throw new Error(p.error??'Không thể tải proof'); setData(p.data as Analytics);}).catch((e:Error)=>setError(e.message)); }, []);
  return <><PublicHeader /><AppShell><PageHeader title="Proof của tôi" subtitle="Tổng hợp proof đã nộp và đã duyệt." />{error ? <ErrorState title="Không thể tải proof" description={error} /> : null}{!data && !error ? <EmptyState title="Chưa có dữ liệu" description="Dữ liệu proof sẽ xuất hiện sau khi bạn nộp." /> : <div className="dc-grid-dashboard"><div className="dc-card p-4"><p className="text-sm text-zinc-600">Proof đã nộp</p><p className="text-2xl font-bold">{data?.proofSubmitted ?? 0}</p></div><div className="dc-card p-4"><p className="text-sm text-zinc-600">Proof đã duyệt</p><p className="text-2xl font-bold">{data?.proofApproved ?? 0}</p></div></div>}</AppShell></>;
}
