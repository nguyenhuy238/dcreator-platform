import Link from "next/link";
import Image from "next/image";
import { StatusBadge } from "../ui/base";

type CampaignItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover: string;
  status: "active" | "review" | "ended" | "full";
  campaignType: "Sponsorship" | "Voucher" | "Product Launch";
  brand: string;
  creator: string;
  fundedAmount: number;
  targetAmount: number;
  backers: number;
  rewardsLeft: number;
  daysLeft: number;
};

const currency = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

export function CampaignProgress({ fundedAmount, targetAmount }: { fundedAmount: number; targetAmount: number }) {
  const percent = Math.min(100, Math.round((fundedAmount / Math.max(targetAmount, 1)) * 100));
  return <div><div className="mb-1 flex items-center justify-between text-xs text-zinc-500"><span>{percent}% mục tiêu</span><span>{currency(fundedAmount)} / {currency(targetAmount)}</span></div><div className="h-2 rounded-full bg-zinc-100"><div className="h-2 rounded-full bg-zinc-900" style={{ width: `${percent}%` }} /></div></div>;
}

export function CampaignCard({ campaign }: { campaign: CampaignItem }) {
  return <article className="dc-card dc-hover-lift overflow-hidden"><Image src={campaign.cover} alt={campaign.title} width={1200} height={675} className="h-44 w-full object-cover" /><div className="space-y-3 p-4"><div className="flex flex-wrap gap-2"><StatusBadge status={campaign.status} /><span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold">{campaign.campaignType}</span></div><h3 className="text-lg font-bold">{campaign.title}</h3><p className="text-sm text-zinc-600">{campaign.description}</p><p className="text-sm text-zinc-500">{campaign.brand} • {campaign.creator}</p><CampaignProgress fundedAmount={campaign.fundedAmount} targetAmount={campaign.targetAmount} /><div className="grid grid-cols-3 gap-2 text-xs text-zinc-500"><p>{campaign.backers} backers</p><p>{campaign.daysLeft} ngày</p><p>{campaign.rewardsLeft} rewards</p></div><Link href={`/campaigns/${campaign.slug}`} className="dc-btn-primary">Xem chi tiết</Link></div></article>;
}

export function RewardCard({ title, description, price, stock, benefits, eta }: { title: string; description: string; price: string; stock: number; benefits: string[]; eta: string }) {
  const disabled = stock <= 0;
  return <article className="dc-card p-4"><h4 className="font-bold">{title}</h4><p className="mt-1 text-sm text-zinc-600">{description}</p><p className="mt-3 text-2xl font-black">{price}</p><p className="mt-1 text-xs text-zinc-500">Còn {stock} lượt • Dự kiến {eta}</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-600">{benefits.map((b) => <li key={b}>{b}</li>)}</ul><button disabled={disabled} className="dc-btn-primary mt-4 w-full">{disabled ? "Hết lượt" : "Chọn reward"}</button></article>;
}

export function MissionCard({ title, status, reward, due }: { title: string; status: string; reward: string; due: string }) {
  return <article className="dc-card p-4"><div className="mb-2 flex items-center justify-between"><h4 className="font-bold">{title}</h4><StatusBadge status={status} /></div><p className="text-sm text-zinc-600">Thưởng: {reward}</p><p className="text-xs text-zinc-500">Deadline: {due}</p><Link href="/me/missions" className="dc-btn-secondary mt-3">Nộp proof</Link></article>;
}

export function VoucherCard({ code, status, expiry }: { code: string; status: string; expiry: string }) {
  return <article className="dc-card p-4"><div className="flex items-center justify-between"><p className="font-mono text-lg font-bold tracking-wide">{code}</p><StatusBadge status={status} /></div><p className="mt-2 text-sm text-zinc-600">Hết hạn: {expiry}</p><Link href={`/vouchers/${code}`} className="dc-btn-secondary mt-3">Xem voucher</Link></article>;
}
