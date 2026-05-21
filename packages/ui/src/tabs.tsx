"use client";

import { cn } from "./utils";

export type TabItem = { key: string; label: string };

export function Tabs({ items, activeKey, onChange }: { items: TabItem[]; activeKey: string; onChange: (key: string) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-dc-border bg-white p-1">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-semibold transition",
            activeKey === item.key ? "bg-dc-primary text-white" : "text-dc-muted hover:bg-zinc-100",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
