import { Badge } from "./badge";
import { Button } from "./button";
import { Card } from "./card";

export function MissionCard({ title, rewardText, deadlineText, status }: { title: string; rewardText: string; deadlineText: string; status: "open" | "ongoing" | "done" }) {
  const label = status === "open" ? "Sẵn sàng" : status === "ongoing" ? "Đang làm" : "Hoàn thành";
  const variant = status === "open" ? "info" : status === "ongoing" ? "warning" : "success";

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-lg font-black text-dc-text">{title}</h3>
        <Badge label={label} variant={variant} />
      </div>
      <p className="mt-2 text-sm text-dc-muted">Quyền lợi: {rewardText}</p>
      <p className="mt-1 text-xs text-dc-muted">Hạn chót: {deadlineText}</p>
      <Button className="mt-4 w-full">Tham gia</Button>
    </Card>
  );
}
