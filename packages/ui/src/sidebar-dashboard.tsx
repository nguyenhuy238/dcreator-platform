import { cn } from "./utils";

const baseItems = ["Overview", "Campaigns", "Missions", "Rewards/Vouchers", "Wallet", "Analytics", "Settings"];
const adminItems = ["Overview", "Moderation", "Fraud Risk", "Users", "Campaign Review", "Audit Logs", "Settings"];

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
