import { useState } from "react";
import { Bookmark, Grid2X2, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { ListingCard } from "@/components/ui/ListingCard";
import { StoreCard } from "@/components/ui/StoreCard";
import { mockListings, mockStores } from "@/data/mock";

export default function Saved() {
  const [tab, setTab] = useState<"items" | "stores">("items");
  const savedListings = mockListings.filter((item) => item.isSaved);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Your collection</p>
        <h1 className="mt-1 font-display text-3xl font-medium text-ink">Saved</h1>
        <p className="mt-1 text-sm text-ink-faint">Keep interesting products and stores close.</p>
      </header>

      <div className="inline-flex rounded-full border border-border bg-surface p-1">
        <TabButton active={tab === "items"} onClick={() => setTab("items")} icon={Bookmark}>Saved items</TabButton>
        <TabButton active={tab === "stores"} onClick={() => setTab("stores")} icon={Store}>Stores</TabButton>
      </div>

      {tab === "items" ? (
        <div className="mx-auto w-full max-w-2xl divide-y divide-border">
          {savedListings.length ? savedListings.map((item) => <ListingCard key={item.id} listing={item} />) : (
            <div className="rounded-xl border border-dashed border-border-strong p-10 text-center">
              <Grid2X2 className="mx-auto h-8 w-8 text-ink-faint" />
              <p className="mt-3 font-medium text-ink">Nothing saved yet</p>
              <Link className="mt-2 inline-block text-sm text-accent" to="/browse">Browse listings</Link>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {mockStores.map((store) => <StoreCard key={store.id} store={store} />)}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof Bookmark; children: string }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${active ? "bg-accent text-white" : "text-ink-soft hover:text-ink"}`}>
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}
