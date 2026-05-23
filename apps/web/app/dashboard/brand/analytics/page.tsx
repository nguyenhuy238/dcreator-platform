"use client";
import { useEffect, useState } from "react";
import { ErrorState, PageHeader, StatsCard } from "@/app/components/dcreator/ui/base";

export default function BrandAnalyticsPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch('/api/brand/dashboard/analytics',{cache:'no-store'}).then(async r=>{const p=await r.json(); if(!r.ok||!p.success) throw new Error(p.error??'Không thể tải analytics'); setData(p.data as Record<string, unknown>);}).catch((e:Error)=>setError(e.message)); }, []);
  return <><PageHeader title="KPI / Analytics" subtitle="Hiệu suất campaign và vận hành Brand." />{error ? <ErrorState title="Không thể tải analytics" description={error} /> : null}{data ? <section className="dc-grid-dashboard">{Object.entries(data).slice(0,4).map(([k,v]) => <StatsCard key={k} title={k} value={typeof v==='number' ? v.toLocaleString('vi-VN') : String(v)} />)}</section> : null}</>;
}


