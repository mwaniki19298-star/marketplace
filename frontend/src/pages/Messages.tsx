import { useState } from "react";
import { CheckCheck, MessageCircle, Search, Send } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
const threads = [
  { id: "1", name: "Amara's Woven Goods", preview: "The basket is ready for pickup.", time: "10:42", unread: 2 },
  { id: "2", name: "Juma Repairs", preview: "Your phone can be collected after 3pm.", time: "Yesterday", unread: 0 },
  { id: "3", name: "Kito Studio", preview: "I can do the portrait session Saturday.", time: "Mon", unread: 0 },
];
export default function Messages() {
  const [active, setActive] = useState(threads[0]);
  return (
    <div className="mx-auto grid h-[calc(100vh-8rem)] w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface md:grid-cols-[320px_1fr]">
      <aside className="border-r border-border">
        <div className="border-b border-border p-4"><h1 className="font-display text-2xl text-ink">Messages</h1><label className="relative mt-3 block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-faint" /><input className="h-10 w-full rounded-lg border border-border bg-surface-alt pl-9 pr-3 text-sm text-ink" placeholder="Search conversations..." /></label></div>
        <div>{threads.map((t) => <button key={t.id} onClick={() => setActive(t)} className={`flex w-full items-center gap-3 border-b border-border p-4 text-left hover:bg-surface-sunken ${active.id===t.id ? "bg-accent-soft/60" : ""}`}><Avatar name={t.name} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{t.name}</p><p className="truncate text-xs text-ink-faint">{t.preview}</p></div><div className="flex flex-col items-end gap-1"><span className="text-[10px] text-ink-faint">{t.time}</span>{t.unread>0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">{t.unread}</span>}</div></button>)}</div>
      </aside>
      <section className="hidden min-w-0 flex-col md:flex">
        <div className="flex items-center gap-3 border-b border-border p-4"><Avatar name={active.name}/><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">{active.name}</p><p className="text-xs text-success">Online</p></div><MessageCircle className="h-5 w-5 text-ink-faint" /></div>
        <div className="flex flex-1 flex-col justify-end gap-3 overflow-y-auto bg-surface-alt p-4">
          <div className="max-w-[75%] self-start rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3 text-sm text-ink">Hi! Your order is ready for pickup. 😊</div>
          <div className="max-w-[75%] self-end rounded-2xl rounded-br-sm bg-accent px-4 py-3 text-sm text-white">Great, I'll come later today. Thank you!</div>
          <div className="flex items-center gap-1 self-end text-[10px] text-ink-faint">10:43 <CheckCheck className="h-3 w-3" /></div>
        </div>
        <div className="border-t border-border p-3"><div className="flex items-center gap-2"><input className="h-11 flex-1 rounded-xl border border-border bg-surface-alt px-4 text-sm text-ink" placeholder="Write a message..." /><button className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white"><Send className="h-4 w-4" /></button></div></div>
      </section>
    </div>
  );
}
