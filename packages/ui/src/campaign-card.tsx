import { Button } from "./button";
import { Card } from "./card";
import { Progress } from "./progress";

export function CampaignCard({ title, creatorName, progress, raisedText }: { title: string; creatorName: string; progress: number; raisedText: string }) {
  return (
    <Card className="transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 aspect-[16/10] rounded-xl bg-dc-subtle" />
      <p className="text-xs text-dc-muted">{creatorName}</p>
      <h3 className="mt-1 font-heading text-lg font-black text-dc-text">{title}</h3>
      <div className="mt-3">
        <Progress value={progress} />
        <p className="mt-2 text-sm text-dc-muted">{raisedText}</p>
      </div>
      <Button className="mt-4 w-full">Ủng hộ</Button>
    </Card>
  );
}
