"use client";
import { useEffect, useState } from "react";
import { EmptyState, ErrorState, PageHeader } from "@/app/components/dcreator/ui/base";

export default function BrandApplicationsPage() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState("");
  useEffect(() => { fetch('/api/brand/dashboard/creator-applications',{cache:'no-store'}).then(async r=>{const p=await r.json(); if(!r.ok||!p.success) throw new Error(p.error??'Không thể tải đơn ứng tuyển'); setItems((p.data ?? []) as Array<Record<string, unknown>>);}).catch((e:Error)=>setError(e.message)); }, []);
  return <><PageHeader title="Creator ứng tuyển" subtitle="Danh sách đơn ứng tuyển vào campaign của Brand." />{error ? <ErrorState title="Không thể tải đơn" description={error} /> : null}{items.length===0 && !error ? <EmptyState title="Chưa có đơn ứng tuyển" description="Đơn ứng tuyển sẽ hiển thị tại đây." /> : <div className="grid gap-3">{items.map((x,i)=><article key={String(x.id ?? i)} className="dc-card p-4"><pre className="overflow-auto text-xs">{JSON.stringify(x, null, 2)}</pre></article>)}</div>}</>;
}


