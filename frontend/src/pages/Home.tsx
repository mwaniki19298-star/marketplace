import type { ReactNode } from "react";
import { ArrowRight, Inbox, MessageCircle, PackageCheck, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { ListingCard } from "@/components/ui/ListingCard";
import { StoreCard } from "@/components/ui/StoreCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { mockListings, mockOrders, mockStores } from "@/data/mock";

const categories = [
  "Electronics",
  "Fashion",
  "Home & Living",
  "Services",
  "Repairs",
  "Photography",
  "Food & Drinks",
  "Books & Stationery",
];

const statusLabel: Record<string, string> = {
  requested: "Awaiting response",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready for pickup",
  completed: "Completed",
  declined: "Declined",
};

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">
          Welcome back, Peter 👋
        </h1>
        <p className="text-sm text-ink-faint">Here's what's happening in your marketplace.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat icon={ShoppingBag} label="Orders" value="2" />
        <SummaryStat icon={PackageCheck} label="Completed" value="14" />
        <SummaryStat icon={MessageCircle} label="Messages" value="3" />
        <SummaryStat icon={Inbox} label="Saved items" value="9" />
      </section>

      <section
        className="relative overflow-hidden rounded-lg border border-border bg-ink px-6 py-8 text-white md:px-10 md:py-12"
        aria-label="Featured"
      >
        <div className="relative z-10 max-w-md">
          <Badge tone="accent" className="mb-3 bg-white/10 text-white">
            New this week
          </Badge>
          <h2 className="font-display text-2xl font-medium leading-tight md:text-3xl">
            List what you make. Meet the people who want it.
          </h2>
          <p className="mt-2 text-sm text-white/70">
            Opening a store takes a few minutes — no fees to get started.
          </p>
          <Link
            to="/sell"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-ink transition-opacity hover:opacity-90"
          >
            Start selling
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-accent/40 blur-3xl"
          aria-hidden="true"
        />
      </section>

      <Section title="Popular categories">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <Link
              key={category}
              to={`/browse?category=${encodeURIComponent(category)}`}
              className="shrink-0 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              {category}
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Recommended stores" seeAllTo="/browse?type=store">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {mockStores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      </Section>

      <Section title="Trending products" seeAllTo="/browse">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {mockListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </Section>

      <Section title="Recent orders" seeAllTo="/orders">
        {mockOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders yet"
            description="Requests you send to sellers will show up here."
          />
        ) : (
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {mockOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-3 p-3">
                <img
                  src={order.listingImageUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-sm object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{order.listingTitle}</p>
                  <p className="truncate text-xs text-ink-faint">{order.counterpartyName}</p>
                </div>
                <Badge tone={order.status === "completed" ? "success" : "accent"}>
                  {statusLabel[order.status]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Stores you follow" seeAllTo="/following">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {mockStores
            .filter((store) => store.isFollowing)
            .map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
        </div>
      </Section>
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-strong">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <p className="font-display text-lg font-medium leading-none text-ink">{value}</p>
        <p className="mt-1 text-xs text-ink-faint">{label}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  seeAllTo,
  children,
}: {
  title: string;
  seeAllTo?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {seeAllTo && (
          <Link
            to={seeAllTo}
            className="text-sm font-medium text-accent transition-colors hover:text-accent-strong"
          >
            See all
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
