"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type SettingsAccordionProps = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function SettingsAccordion({ title, description, defaultOpen = false, children }: SettingsAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <details
      className="overflow-hidden rounded-3xl border border-zinc-200 bg-white"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
            {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
          </div>
          <span className="shrink-0 rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600">
            {open ? "Đóng" : "Mở"}
          </span>
        </div>
      </summary>
      <div className="border-t border-zinc-100 px-5 py-5">{children}</div>
    </details>
  );
}
