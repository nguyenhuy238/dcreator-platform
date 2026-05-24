import { LoadingBlock, LoadingSpinner } from "@/app/components/dcreator/ui/base";

export default function AdminLoading() {
  return (
    <div className="grid gap-4">
      <LoadingSpinner label="Đang tải dữ liệu quản trị..." />
      <LoadingBlock className="h-8 w-52 rounded-lg bg-zinc-200" />
      <LoadingBlock className="h-20 rounded-2xl bg-zinc-200" />
      <LoadingBlock className="h-20 rounded-2xl bg-zinc-200" style={{ animationDelay: "80ms" }} />
      <LoadingBlock className="h-20 rounded-2xl bg-zinc-200" style={{ animationDelay: "160ms" }} />
    </div>
  );
}
