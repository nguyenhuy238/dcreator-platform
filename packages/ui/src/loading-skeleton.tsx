export function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-40 animate-pulse rounded-2xl bg-zinc-100" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-100" />
    </div>
  );
}
