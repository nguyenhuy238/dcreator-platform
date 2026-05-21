import { cn } from "./utils";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

const badgeVariants: Record<BadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  error: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  neutral: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

export function Badge({ label, variant = "neutral", className }: { label: string; variant?: BadgeVariant; className?: string }) {
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", badgeVariants[variant], className)}>{label}</span>;
}
