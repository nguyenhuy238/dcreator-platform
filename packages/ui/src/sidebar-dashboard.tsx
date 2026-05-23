import { cn } from "./utils";

const baseItems = ["Tổng quan", "Chiến dịch", "Nhiệm vụ", "Quyền lợi/Voucher", "Ví", "Phân tích", "Cài đặt"];
const adminItems = ["Tổng quan", "Kiểm duyệt", "Rủi ro gian lận", "Người dùng", "Duyệt chiến dịch", "Nhật ký kiểm toán", "Cài đặt"];

export function SidebarDashboard({ adminMode = false }: { adminMode?: boolean }) {
  const items = adminMode ? adminItems : baseItems;

  return (
    <nav className="rounded-2xl border border-dc-border bg-white p-3 shadow-card">
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={item} className={cn("rounded-xl px-3 py-2 text-sm", index === 0 ? "bg-dc-primary text-white" : "text-dc-muted hover:bg-zinc-100 hover:text-dc-text")}>
            {item}
          </li>
        ))}
      </ul>
    </nav>
  );
}
