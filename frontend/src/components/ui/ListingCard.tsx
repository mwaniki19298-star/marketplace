import { Bookmark, Heart, MapPin, MessageCircle, MoreHorizontal, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import type { Listing } from "@/types";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { RatingStars } from "./RatingStars";

interface ListingCardProps {
  listing: Listing;
  onToggleSave?: (id: string) => void;
  className?: string;
}

const currencyFormatters = new Map<string, Intl.NumberFormat>();
function formatPrice(amount: number, currency: string) {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
    currencyFormatters.set(currency, formatter);
  }
  return formatter.format(amount);
}

export function ListingCard({ listing, onToggleSave, className }: ListingCardProps) {
  return (
    <article
      className={cn(
        "block w-full min-w-0 max-w-full overflow-hidden border-b border-border bg-surface sm:rounded-xl sm:border sm:shadow-xs",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
        <Avatar name={listing.store.name} src={listing.store.logoUrl} size="md" className="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <Link
            to={`/stores/${listing.store.id}`}
            className="block truncate text-sm font-semibold text-ink hover:underline"
          >
            {listing.store.name}
          </Link>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-faint">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{listing.location}</span>
          </p>
        </div>
        {listing.kind === "service" && <Badge tone="accent">Service</Badge>}
        <button
          type="button"
          aria-label="More listing options"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunken"
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <Link
        to={`/products/${listing.id}`}
        className="relative block w-full max-w-full overflow-hidden bg-surface-sunken aspect-[1/1.08] sm:aspect-[4/4.5]"
        aria-label={`View ${listing.title}`}
      >
        <img
          src={listing.imageUrl}
          alt={listing.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.015]"
        />
      </Link>

      <div className="px-3 pb-4 pt-3 sm:px-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Like listing"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-sunken"
          >
            <Heart className="h-[22px] w-[22px]" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Comment on listing"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-sunken"
          >
            <MessageCircle className="h-[21px] w-[21px]" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Share listing"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-sunken"
          >
            <Share2 className="h-[20px] w-[20px]" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onToggleSave?.(listing.id)}
            aria-pressed={listing.isSaved}
            aria-label={listing.isSaved ? "Remove from saved" : "Save listing"}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-sunken"
          >
            <Bookmark
              className={cn("h-[21px] w-[21px]", listing.isSaved && "fill-accent text-accent")}
              aria-hidden="true"
            />
          </button>
        </div>

        <p className="mt-1 text-xs font-medium text-ink-soft">
          {listing.savedCount > 0 ? `${listing.savedCount.toLocaleString()} people saved this` : "Be the first to save this"}
        </p>

        <div className="mt-2 flex items-start gap-2">
          <p className="min-w-0 flex-1 text-sm leading-6 text-ink">
            <Link to={`/stores/${listing.store.id}`} className="font-semibold hover:underline">
              {listing.store.name}
            </Link>{" "}
            <Link to={`/products/${listing.id}`} className="hover:underline">
              {listing.title}
            </Link>
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-display text-xl font-semibold text-ink">
            {formatPrice(listing.price, listing.currency)}
          </span>
          {listing.negotiable && <span className="text-xs text-ink-faint">Negotiable</span>}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
          <RatingStars rating={listing.rating} reviewCount={listing.reviewCount} />
          {listing.condition && <span className="capitalize">{listing.condition}</span>}
          <span>{listing.category}</span>
        </div>

        <button
          type="button"
          className="mt-3 block text-xs text-ink-faint hover:text-ink"
        >
          View all {listing.reviewCount} reviews
        </button>
      </div>
    </article>
  );
}
