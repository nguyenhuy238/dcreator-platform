const items = ["Trang chủ", "Chiến dịch", "Nhiệm vụ", "Voucher", "Tài khoản"];

export function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-dc-border bg-white md:hidden">
      <ul className="grid grid-cols-5 px-2 py-2 text-center text-xs text-dc-muted">
        {items.map((item) => (
          <li key={item} className="min-h-11 place-content-center rounded-lg px-1 py-2 hover:bg-zinc-100">
            {item}
          </li>
        ))}
      </ul>
    </nav>
  );
}
