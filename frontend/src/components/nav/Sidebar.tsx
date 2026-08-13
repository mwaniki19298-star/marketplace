import { Bell, Bookmark, Compass, Home, MessageCircle, Plus, Store, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";

const primaryItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/browse", label: "Browse", icon: Compass },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/saved", label: "Saved", icon: Bookmark },
  { to: "/dashboard", label: "My store", icon: Store },
] as const;

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
      <div className="flex items-center gap-2 px-2 pb-8">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent font-display text-sm font-semibold text-white">
          M
        </span>
        <span className="font-display text-lg font-medium text-ink">Marketplace</span>
      </div>

      <NavLink
        to="/sell"
        className="mb-6 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Create listing
      </NavLink>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
        {primaryItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors",
                "hover:bg-surface-sunken hover:text-ink",
                isActive && "bg-accent-soft text-accent-strong hover:bg-accent-soft",
              )
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <NavLink
        to="/profile"
        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink"
      >
        <User className="h-4 w-4" aria-hidden="true" />
        Profile
      </NavLink>
    </aside>
  );
}
