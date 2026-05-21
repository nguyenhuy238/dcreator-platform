import { Button } from "./button";

export function ErrorState({ title = "Có lỗi xảy ra", description = "Không tải được dữ liệu. Vui lòng thử lại.", onRetry }: { title?: string; description?: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-heading text-lg font-black text-red-700">{title}</p>
      <p className="mt-1 text-sm text-red-600">{description}</p>
      <Button variant="danger" className="mt-4" onClick={onRetry}>Thử lại</Button>
    </div>
  );
}
