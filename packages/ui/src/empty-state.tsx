import { Button } from "./button";
import { Card } from "./card";

export function EmptyState({ title = "Chưa có dữ liệu", description = "Hiện chưa có nội dung phù hợp.", ctaLabel = "Tham gia", onCta }: { title?: string; description?: string; ctaLabel?: string; onCta?: () => void }) {
  return (
    <Card className="text-center">
      <p className="font-heading text-lg font-black text-dc-text">{title}</p>
      <p className="mt-1 text-sm text-dc-muted">{description}</p>
      {onCta ? <Button className="mt-4" onClick={onCta}>{ctaLabel}</Button> : null}
    </Card>
  );
}
