"use client";
import { useEffect, useState } from "react";
import { EmptyState, ErrorState, PageHeader } from "@/app/components/dcreator/ui/base";

export default function BrandCampaignsPage() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState("");
  useEffect(() => { fetch('/api/brand/dashboard/campaigns',{cache:'no-store'}).then(async r=>{const p=await r.json(); if(!r.ok||!p.success) throw new Error(p.error??'Không thể tải campaign'); setItems((p.data ?? []) as Array<Record<string, unknown>>);}).catch((e:Error)=>setError(e.message)); }, []);
  return <><PageHeader title="Campaign / Job" subtitle="Danh sách campaign của Brand." />{error ? <ErrorState title="Không thể tải campaign" description={error} /> : null}{items.length===0 && !error ? <EmptyState title="Chưa có campaign" description="Hãy tạo campaign mới." /> : <div className="grid gap-3">{items.map((x,i)=><article key={String(x.id ?? i)} className="dc-card p-4"><pre className="overflow-auto text-xs">{JSON.stringify(x, null, 2)}</pre></article>)}</div>}</>;
}


