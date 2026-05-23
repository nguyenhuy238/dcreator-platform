"use client";
import { useEffect, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { EmptyState, ErrorState, PageHeader } from "@/app/components/dcreator/ui/base";

export default function CreatorChannelsPage() {
  const [items, setItems] = useState<Array<{ platform: string; url: string }>>([]);
  const [error, setError] = useState("");
  useEffect(() => { fetch('/api/creator/dashboard/channels',{cache:'no-store'}).then(async r=>{const p=await r.json(); if(!r.ok||!p.success) throw new Error(p.error??'Không thể tải kênh'); setItems((p.data?.channels ?? p.data ?? []) as Array<{ platform: string; url: string }>);}).catch((e:Error)=>setError(e.message)); }, []);
  return <><PublicHeader /><AppShell><PageHeader title="Kênh mạng xã hội" subtitle="Quản lý kênh social dùng cho nhiệm vụ Creator." />{error ? <ErrorState title="Không thể tải kênh" description={error} /> : null}{items.length===0 && !error ? <EmptyState title="Chưa có kênh" description="Thêm kênh mạng xã hội để nhận job phù hợp." /> : <div className="grid gap-3">{items.map((x,i)=><article key={`${x.platform}-${i}`} className="dc-card p-4"><p className="font-semibold">{x.platform}</p><p className="text-sm text-zinc-600">{x.url}</p></article>)}</div>}</AppShell></>;
}
