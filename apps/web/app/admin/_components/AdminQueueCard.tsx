import Link from "next/link";

type AdminQueueCardProps = {
  title: string;
  value: number;
  href: string;
};

export function AdminQueueCard({ title, value, href }: AdminQueueCardProps) {
  return (
    <Link href={href} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:shadow">
      <p className="text-sm font-semibold text-zinc-700">{title}</p>
      <p className="mt-2 text-3xl font-black text-zinc-900">{value}</p>
      <p className="mt-2 text-xs text-zinc-500">Mở module</p>
    </Link>
  );
}
