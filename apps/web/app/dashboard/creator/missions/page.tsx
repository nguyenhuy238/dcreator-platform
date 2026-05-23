"use client";
import { useEffect, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, PageHeader, StatusBadge } from "@/app/components/dcreator/ui/base";

type Mission = { id: string; status: string; mission: { title: string; rewardPoints: number; deadlineAt: string | null }; campaign: { title: string } };

export default function CreatorMissionsPage() {
  const [items, setItems] = useState<Mission[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { fetch('/api/me/mission',{cache:'no-store'}).then(async r=>{const p=await r.json(); if(!r.ok||!p.success) throw new Error(p.error??'Không thể tải nhiệm vụ'); setItems(p.data as Mission[]);}).catch((e:Error)=>setError(e.message)); }, []);
  return <><PublicHeader /><AppShell><PageHeader title="Nhiệm vụ của tôi" subtitle="Danh sách nhiệm vụ Creator đang thực hiện." />{error ? <ErrorState title="Không thể tải nhiệm vụ" description={error} /> : null}{items.length===0 && !error ? <EmptyState title="Chưa có nhiệm vụ" description="Bạn chưa nhận nhiệm vụ nào." /> : <div className="grid gap-3">{items.map((m)=><article key={m.id} className="dc-card p-4"><div className="flex items-center justify-between"><p className="font-semibold">{m.mission.title}</p><StatusBadge status={m.status.toLowerCase()} /></div><p className="text-sm text-zinc-600">{m.campaign.title}</p></article>)}</div>}</AppShell></>;
}
