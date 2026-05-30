import { useState } from "react";

const items = ["Trang chủ", "Chiến dịch", "Nhiệm vụ", "Voucher", "Tài khoản"];

export function MobileBottomNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-20 md:hidden">
      {isOpen ? (
        <nav className="mb-2 overflow-hidden rounded-2xl border border-dc-border bg-white shadow-md">
          <ul className="grid grid-cols-5 px-2 py-2 text-center text-xs text-dc-muted">
            {items.map((item) => (
              <li key={item} className="min-h-11 place-content-center rounded-lg px-1 py-2 hover:bg-zinc-100">
                {item}
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Đóng menu" : "Mở menu"}
        className="rounded-full border border-dc-border bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-100"
      >
        <span aria-hidden="true">{isOpen ? "✕" : "☰"}</span>
      </button>
    </div>
  );
}
