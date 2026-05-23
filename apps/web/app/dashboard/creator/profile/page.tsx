"use client";
import { useEffect, useState } from "react";
import { AppShell, PublicHeader } from "@/app/components/dcreator/layout/shell";
import { ErrorState, PageHeader } from "@/app/components/dcreator/ui/base";

export default function CreatorProfilePage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch('/api/creator/dashboard/profile',{cache:'no-store'}).then(async r=>{const p=await r.json(); if(!r.ok||!p.success) throw new Error(p.error??'Không thể tải hồ sơ'); setData(p.data as Record<string, unknown>);}).catch((e:Error)=>setError(e.message)); }, []);
  return <><PublicHeader /><AppShell><PageHeader title="Hồ sơ Creator" subtitle="Thông tin hồ sơ và portfolio của Creator." />{error ? <ErrorState title="Không thể tải hồ sơ" description={error} /> : null}{data ? <article className="dc-card p-5"><pre className="overflow-auto text-xs text-zinc-700">{JSON.stringify(data, null, 2)}</pre></article> : null}</AppShell></>;
}
