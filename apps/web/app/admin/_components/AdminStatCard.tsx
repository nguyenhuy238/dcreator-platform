type AdminStatCardProps = {
  title: string;
  value: number | string;
  hint?: string;
};

export function AdminStatCard({ title, value, hint }: AdminStatCardProps) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-zinc-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </article>
  );
}
