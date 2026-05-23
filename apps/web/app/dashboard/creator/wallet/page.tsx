"use client";
import { useEffect, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { ErrorState, PageHeader } from "@/app/components/dcreator/ui/base";

export default function CreatorWalletPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch('/api/creator/dashboard/payouts',{cache:'no-store'}).then(async r=>{const p=await r.json(); if(!r.ok||!p.success) throw new Error(p.error??'Không thể tải ví'); setData(p.data as Record<string, unknown>);}).catch((e:Error)=>setError(e.message)); }, []);
  return <><PublicHeader /><AppShell><PageHeader title="Ví Creator" subtitle="Hoa hồng và lịch sử payout của Creator." />{error ? <ErrorState title="Không thể tải ví" description={error} /> : null}{data ? <article className="dc-card p-5"><pre className="overflow-auto text-xs text-zinc-700">{JSON.stringify(data, null, 2)}</pre></article> : null}</AppShell></>;
}
