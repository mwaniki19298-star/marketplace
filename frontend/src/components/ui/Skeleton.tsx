export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-sunken ${className ?? ""}`} />;
}

export function ListingCardSkeleton() {
  return (
    <div className="w-full overflow-hidden border-b border-border bg-surface sm:rounded-xl sm:border">
      <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="aspect-[4/5] w-full rounded-none sm:aspect-[4/4.5]" />
      <div className="space-y-2 px-3 pb-4 pt-3 sm:px-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="ml-auto h-9 w-9 rounded-full" />
        </div>
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-6 w-28" />
      </div>
    </div>
  );
}
