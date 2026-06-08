import Link from "next/link";

type AdminQueueCardProps = {
  title: string;
  value: number;
  href: string;
  description?: string;
};

export function AdminQueueCard({
  title,
  value,
  href,
  description,
}: AdminQueueCardProps) {
  return (
    <Link
      href={href}
      className="flex min-h-40 flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:shadow"
    >
      <p className="text-sm font-semibold text-zinc-700">{title}</p>
      <p className="mt-2 text-3xl font-black text-zinc-900">{value}</p>
      {description ? (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">
          {description}
        </p>
      ) : null}
      <p className="mt-auto pt-4 text-xs font-bold text-zinc-900">Mở module</p>
    </Link>
  );
}
