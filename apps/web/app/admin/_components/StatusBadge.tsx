import { StatusBadge as BaseStatusBadge } from "@/app/components/dcreator/ui/base";

export function StatusBadge({ status }: { status: string }) {
  return <BaseStatusBadge status={status} />;
}
