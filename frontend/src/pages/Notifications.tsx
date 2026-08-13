import { CheckCircle2, Heart, MessageCircle, ShoppingBag, Star } from "lucide-react";
const items = [
  { icon: ShoppingBag, title: "Order update", text: "Amara's Woven Goods accepted your request.", time: "12 min ago", tone: "accent" },
  { icon: MessageCircle, title: "New message", text: "Juma Repairs replied to your conversation.", time: "1 hr ago", tone: "info" },
  { icon: Heart, title: "Store update", text: "Joyce Bookstore added 3 new books.", time: "Yesterday", tone: "warning" },
  { icon: Star, title: "Review reminder", text: "Your completed order is ready for a review.", time: "Yesterday", tone: "success" },
];
export default function Notifications() {
  return <div className="mx-auto w-full max-w-2xl space-y-5"><header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Stay in the loop</p><h1 className="mt-1 font-display text-3xl text-ink">Notifications</h1></header><div className="overflow-hidden rounded-2xl border border-border bg-surface">{items.map(({icon:Icon,title,text,time,tone}) => <article key={title} className="flex gap-3 border-b border-border p-4 last:border-b-0 hover:bg-surface-sunken"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone==="success"?"bg-success-soft text-success":tone==="warning"?"bg-warning-soft text-warning":"bg-accent-soft text-accent-strong"}`}><Icon className="h-4.5 w-4.5"/></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-ink">{title}</p><span className="text-[11px] text-ink-faint">{time}</span></div><p className="mt-1 text-sm text-ink-soft">{text}</p></div><CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /></article>)}</div></div>;
}
