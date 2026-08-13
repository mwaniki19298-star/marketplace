import { cn } from "@/lib/cn";
import type { Store } from "@/types";
import { Avatar } from "./Avatar";
import { RatingStars } from "./RatingStars";
import { VerificationBadge } from "./VerificationBadge";

interface StoreCardProps {
  store: Store;
  className?: string;
}

export function StoreCard({ store, className }: StoreCardProps) {
  return (
    <article
      className={cn(
        "flex w-56 shrink-0 flex-col gap-3 rounded-lg border border-border bg-surface p-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar name={store.name} src={store.logoUrl} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{store.name}</p>
          <VerificationBadge level={store.seller.verification} />
        </div>
      </div>
      <RatingStars rating={store.rating} reviewCount={store.reviewCount} size="md" />
      <p className="truncate text-xs text-ink-faint">{store.categories.join(" · ")}</p>
    </article>
  );
}
