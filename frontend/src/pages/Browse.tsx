import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { ListingCard } from "@/components/ui/ListingCard";
import { ListingCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { mockListings } from "@/data/mock";

const filters = ["All", "Products", "Services", "New", "Used", "Nearby"] as const;

export default function Browse() {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All");
  const [isLoading] = useState(false);
  const results = mockListings;

  return (
    <div className="mx-auto w-full min-w-0 max-w-full sm:max-w-2xl">
      <header className="px-0 pb-3 pt-2 sm:px-0 sm:pb-5 sm:pt-1">
        <h1 className="font-display text-2xl font-medium text-ink">Browse</h1>
        <p className="mt-0.5 text-sm text-ink-faint">{results.length} listings near you</p>
      </header>

      <div className="sticky top-0 z-20 mb-2 border-y border-border bg-surface/95 px-3 py-2 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm " +
                (activeFilter === filter
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-border bg-surface text-ink-soft hover:border-border-strong")
              }
            >
              {filter}
            </button>
          ))}
          <button
            type="button"
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-border-strong sm:text-sm"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="divide-y divide-border sm:space-y-4 sm:divide-y-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No listings match your search"
          description="Try a broader keyword, or clear some filters to see more results."
        />
      ) : (
        <div className="divide-y divide-border sm:space-y-4 sm:divide-y-0">
          {results.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
