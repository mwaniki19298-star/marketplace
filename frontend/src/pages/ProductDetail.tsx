import { useParams } from "react-router-dom";
import { Bookmark, MapPin, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RatingStars } from "@/components/ui/RatingStars";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { Avatar } from "@/components/ui/Avatar";
import { ListingCard } from "@/components/ui/ListingCard";
import { mockListings, mockSellers } from "@/data/mock";

export default function ProductDetail() {
  const { id } = useParams();
  const listing = mockListings.find((item) => item.id === id) ?? mockListings[0]!;
  const seller = mockSellers.amara;
  const similar = mockListings.filter((item) => item.id !== listing.id).slice(0, 3);

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
      <div className="lg:w-3/5">
        <div className="overflow-hidden rounded-lg border border-border bg-surface-sunken">
          <img src={listing.imageUrl} alt={listing.title} className="aspect-[4/3] w-full object-cover" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {listing.kind === "service" && (
              <Badge tone="accent" className="mb-2">
                Service
              </Badge>
            )}
            <h1 className="font-display text-xl font-medium leading-snug text-ink md:text-2xl">
              {listing.title}
            </h1>
          </div>
          <div className="flex shrink-0 gap-2">
            <IconAction icon={Bookmark} label="Save" />
            <IconAction icon={Share2} label="Share" />
          </div>
        </div>

        <p className="font-display text-3xl font-medium text-ink">
          {new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency: listing.currency,
            maximumFractionDigits: 0,
          }).format(listing.price)}
          {listing.negotiable && (
            <span className="ml-2 align-middle text-sm font-sans font-normal text-ink-faint">
              Negotiable
            </span>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4 text-ink-faint" aria-hidden="true" />
            {listing.location}
          </span>
          <RatingStars rating={listing.rating} reviewCount={listing.reviewCount} size="md" />
          {listing.condition && (
            <span className="capitalize text-ink-faint">{listing.condition}</span>
          )}
        </div>

        <p className="text-sm leading-relaxed text-ink-soft">{listing.description}</p>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
          <Avatar name={seller.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{seller.name}</p>
            <VerificationBadge level={seller.verification} />
          </div>
          <span className="shrink-0 text-xs text-ink-faint">{seller.responseRate}% response rate</span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" size="lg" className="flex-1">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Contact seller
          </Button>
          <Button size="lg" className="flex-1">
            Request purchase
          </Button>
        </div>

        <p className="text-xs text-ink-faint">
          Marketplace doesn't process payments. Agree on payment and delivery directly with the
          seller once your request is accepted.
        </p>
      </div>
      </div>

      {similar.length > 0 && <SimilarProducts items={similar} />}
    </div>
  );
}

function SimilarProducts({ items }: { items: typeof mockListings }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-ink">Similar products</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <ListingCard key={item.id} listing={item} />
        ))}
      </div>
    </div>
  );
}

function IconAction({ icon: Icon, label }: { icon: typeof Bookmark; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-ink-soft transition-colors hover:border-border-strong hover:text-ink"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
