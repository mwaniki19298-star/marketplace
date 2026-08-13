import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock3, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { mockOrders } from "@/data/mock";

const labels: Record<string, string> = {
  requested: "Awaiting response",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready for pickup",
  completed: "Completed",
  declined: "Declined",
};

export default function Orders() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">My activity</p>
        <h1 className="mt-1 font-display text-3xl font-medium text-ink">Orders</h1>
        <p className="mt-1 text-sm text-ink-faint">Track purchase requests and completed transactions.</p>
      </header>

      {mockOrders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No orders yet" description="Your purchase requests will appear here." />
      ) : (
        <div className="space-y-3">
          {mockOrders.map((order) => (
            <article key={order.id} className="rounded-xl border border-border bg-surface p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <img src={order.listingImageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{order.listingTitle}</p>
                  <p className="mt-1 text-xs text-ink-faint">{order.counterpartyName}</p>
                  <p className="mt-1 font-mono text-[11px] text-ink-faint">{order.id}</p>
                </div>
                <Badge tone={order.status === "completed" ? "success" : order.status === "declined" ? "danger" : "accent"}>
                  {labels[order.status]}
                </Badge>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-ink-faint">
                <span className="inline-flex items-center gap-1.5">
                  {order.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                  Updated recently
                </span>
                <Link to="/messages" className="inline-flex items-center gap-1 font-medium text-accent hover:text-accent-strong">
                  Message seller <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
