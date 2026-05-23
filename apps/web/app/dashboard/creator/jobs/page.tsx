"use client";
import { useEffect, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, PageHeader } from "@/app/components/dcreator/ui/base";

type Job = { id: string; title: string; rewardPoints: number; rewardCommissionVnd: number; deadlineAt: string | null; campaign: { title: string; category: string } };

export default function CreatorJobsPage() {
  const [items, setItems] = useState<Job[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { fetch('/api/creator/dashboard/marketplace?campaignStatus=ACTIVE',{cache:'no-store'}).then(async r=>{const p=await r.json(); if(!r.ok||!p.success) throw new Error(p.error??'Không thể tải job'); setItems(p.data as Job[]);}).catch((e:Error)=>setError(e.message)); }, []);
  return <><PublicHeader /><AppShell><PageHeader title="Campaign / Job" subtitle="Danh sách job Creator có thể tham gia." />{error ? <ErrorState title="Không thể tải job" description={error} /> : null}{items.length===0 && !error ? <EmptyState title="Chưa có job" description="Hiện chưa có job phù hợp." /> : <div className="grid gap-3 md:grid-cols-2">{items.map((job)=><article key={job.id} className="dc-card p-4"><p className="font-semibold">{job.title}</p><p className="text-sm text-zinc-600">{job.campaign.title} • {job.campaign.category}</p><p className="text-sm text-zinc-600">Thưởng: {job.rewardPoints} points • {job.rewardCommissionVnd.toLocaleString('vi-VN')}đ</p><p className="text-sm text-zinc-600">Hạn: {job.deadlineAt ? new Date(job.deadlineAt).toLocaleDateString('vi-VN') : 'Không giới hạn'}</p></article>)}</div>}</AppShell></>;
}
