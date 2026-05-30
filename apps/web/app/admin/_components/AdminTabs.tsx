"use client";

export type AdminTabItem = { key: string; label: string };

export function AdminTabs({ items, value, onChange }: { items: AdminTabItem[]; value: string; onChange: (key: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={value === tab.key ? "rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white" : "rounded-full border border-zinc-200 px-4 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
