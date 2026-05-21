import { Badge } from "./badge";
import { Button } from "./button";
import { Card } from "./card";

export function VoucherCard({ code, condition, expiry, claimed }: { code: string; condition: string; expiry: string; claimed: boolean }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-sm font-bold text-dc-text">{code}</p>
        <Badge variant={claimed ? "success" : "neutral"} label={claimed ? "Đã nhận" : "Chưa nhận"} />
      </div>
      <p className="mt-2 text-sm text-dc-muted">{condition}</p>
      <p className="mt-1 text-xs text-dc-muted">Hạn dùng: {expiry}</p>
      <Button className="mt-4 w-full">{claimed ? "Xem voucher" : "Nhận reward"}</Button>
    </Card>
  );
}
