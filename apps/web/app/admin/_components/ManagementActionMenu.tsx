"use client";

import { useState } from "react";

export type ActionMenuItem = { key: string; label: string; danger?: boolean };

export function ManagementActionMenu({ items, onSelect }: { items: ActionMenuItem[]; onSelect: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className="dc-btn-secondary" onClick={() => setOpen((v) => !v)}>Quản lý</button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 min-w-56 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item.key}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-50 ${item.danger ? "text-red-700" : "text-zinc-700"}`}
              onClick={() => {
                setOpen(false);
                onSelect(item.key);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
