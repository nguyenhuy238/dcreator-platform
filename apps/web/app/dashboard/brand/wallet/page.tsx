"use client";
import { useEffect, useState } from "react";
import { ErrorState, PageHeader } from "@/app/components/dcreator/ui/base";

export default function BrandWalletPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch('/api/brand/dashboard/budget',{cache:'no-store'}).then(async r=>{const p=await r.json(); if(!r.ok||!p.success) throw new Error(p.error??'Không thể tải quỹ'); setData(p.data as Record<string, unknown>);}).catch((e:Error)=>setError(e.message)); }, []);
  return <><PageHeader title="Quỹ Brand" subtitle="Số dư và lịch sử quỹ prepaid." />{error ? <ErrorState title="Không thể tải quỹ" description={error} /> : null}{data ? <article className="dc-card p-5"><pre className="overflow-auto text-xs">{JSON.stringify(data, null, 2)}</pre></article> : null}</>;
}


