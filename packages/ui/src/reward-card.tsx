import { Badge } from "./badge";
import { Button } from "./button";
import { Card } from "./card";

export function RewardCard({ title, points, stock }: { title: string; points: number; stock: number }) {
  return (
    <Card>
      <Badge variant="info" label="Reward" />
      <h3 className="mt-2 font-heading text-lg font-black text-dc-text">{title}</h3>
      <p className="mt-1 text-sm text-dc-muted">{points.toLocaleString()} điểm</p>
      <p className="mt-1 text-xs text-dc-muted">Tồn kho: {stock}</p>
      <Button className="mt-4 w-full">Đổi quà</Button>
    </Card>
  );
}
