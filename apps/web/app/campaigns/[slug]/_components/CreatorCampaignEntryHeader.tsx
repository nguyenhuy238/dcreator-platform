import Link from "next/link";

export function CreatorCampaignEntryHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="min-w-0">
          <p className="text-sm font-black text-zinc-900">Creator Workspace</p>
          <p className="text-xs text-zinc-500">Bạn đang xem chi tiết campaign từ bảng Campaign / Job của creator.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/dashboard/creator" className="dc-btn-secondary">
            Creator Dashboard
          </Link>
          <Link href="/dashboard/creator/jobs" className="dc-btn-primary">
            Quay lại Campaign / Job
          </Link>
        </div>
      </div>
    </header>
  );
}
