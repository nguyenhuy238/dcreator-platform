"use client";
import { FormEvent, useState } from "react";
import { PageHeader } from "@/app/components/dcreator/ui/base";

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  async function send(event: FormEvent){
    event.preventDefault();
    const res = await fetch('/api/admin/notifications/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'PAYOUT_APPROVED',channel:'IN_APP',title,content})});
    const p = await res.json();
    setMessage(res.ok && p.success ? 'Đã gửi thông báo.' : (p.error ?? 'Gửi thông báo thất bại'));
  }
  return <main><PageHeader title="Notification" subtitle="Gửi thông báo hệ thống cho người dùng." /><form onSubmit={send} className="dc-card mt-4 grid gap-3 p-5 max-w-2xl"><input className="dc-input" placeholder="Tiêu đề" value={title} onChange={(e)=>setTitle(e.target.value)} required /><textarea className="dc-input min-h-28" placeholder="Nội dung" value={content} onChange={(e)=>setContent(e.target.value)} required /><button className="dc-btn-primary w-fit" type="submit">Gửi thông báo</button>{message ? <p className="text-sm text-zinc-700">{message}</p> : null}</form></main>;
}
