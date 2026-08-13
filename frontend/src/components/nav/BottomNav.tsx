import { Bookmark, Compass, Home, Plus, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/browse", label: "Browse", icon: Compass },
] as const;

const trailingItems = [
  { to: "/saved", label: "Saved", icon: Bookmark },
  { to: "/profile", label: "Profile", icon: User },
] as const;

/**
 * Mobile-only bottom nav. The "Sell" action is the one deliberately bold,
 * fully-rounded element in the whole system — every other control in the
 * product uses restrained corner radii, so this stays legible as *the*
 * primary action wherever a seller-minded person looks for it.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="relative mx-auto grid max-w-content grid-cols-5 items-center px-2">
        {items.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <NavLink
          to="/sell"
          aria-label="Sell — create a new listing"
          className="flex flex-col items-center justify-self-center"
        >
          <span
            className={cn(
              "-mt-6 flex h-14 w-14 items-center justify-center rounded-pill bg-accent text-white shadow-raised",
              "transition-transform active:scale-95",
            )}
          >
            <Plus className="h-6 w-6" aria-hidden="true" strokeWidth={2.5} />
          </span>
          <span className="mt-1 text-[11px] font-medium text-accent-strong">Sell</span>
        </NavLink>

        {trailingItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Home }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center gap-1 py-2.5 text-ink-faint transition-colors",
          isActive && "text-accent",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={isActive ? 2.5 : 2} />
          <span className="text-[11px] font-medium">{label}</span>
        </>
      )}
    </NavLink>
  );
}
