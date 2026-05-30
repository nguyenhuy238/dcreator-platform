import { StatusBadge } from "@/app/components/dcreator/ui/base";

export function RiskFlagBadge({ flagged }: { flagged: boolean }) {
  return <StatusBadge status={flagged ? "rejected" : "approved"} />;
}
