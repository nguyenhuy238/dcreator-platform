import { cn } from "./utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-zinc-100", className)}>
      <div className="h-full rounded-full bg-dc-primary transition-all" style={{ width: `${safeValue}%` }} />
    </div>
  );
}
