import { Button } from "./button";

export function Header({ title = "dCreator", ctaLabel }: { title?: string; ctaLabel?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-dc-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <p className="font-heading text-base font-black">{title}</p>
        <div className="flex items-center gap-2">
          <button className="rounded-xl px-3 py-2 text-sm text-dc-muted hover:bg-zinc-100">Thông báo</button>
          <button className="rounded-xl px-3 py-2 text-sm text-dc-muted hover:bg-zinc-100">Tài khoản</button>
          {ctaLabel ? <Button className="h-9 px-3 py-2 text-xs">{ctaLabel}</Button> : null}
        </div>
      </div>
    </header>
  );
}
