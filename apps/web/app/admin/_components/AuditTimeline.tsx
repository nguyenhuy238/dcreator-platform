type AuditItem = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
};

export function AuditTimeline({ items }: { items: AuditItem[] }) {
  if (items.length === 0) {
    return <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">Chưa có hoạt động gần đây.</div>;
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="border-b border-zinc-100 pb-3 last:border-none last:pb-0">
            <p className="text-sm font-semibold text-zinc-800">{item.action}</p>
            <p className="text-xs text-zinc-500">{item.targetType} · {item.targetId.slice(0, 10)} · {new Date(item.createdAt).toLocaleString("vi-VN")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
