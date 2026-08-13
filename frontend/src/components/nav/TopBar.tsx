import { Bell, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

interface TopBarProps {
  userName: string;
}

export function TopBar({ userName }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-full min-w-0 items-center gap-2 px-3 sm:h-16 sm:max-w-content sm:gap-3 sm:px-4 md:px-6">
        <span className="shrink-0 font-display text-base font-medium text-ink sm:text-lg md:hidden">Marketplace</span>

        <label className="relative flex min-w-0 flex-1 items-center md:ml-0 md:w-full md:max-w-md">
          <Search
            className="pointer-events-none absolute left-3 h-4 w-4 text-ink-faint"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search products..."
            className="h-9 w-full min-w-0 rounded-md border border-border-strong bg-surface-alt pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-faint focus-visible:bg-surface sm:h-10 sm:text-sm"
          />
        </label>

        <button
          type="button"
          aria-label="Notifications"
          className="relative hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunken sm:flex"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
        </button>

        <Avatar name={userName} size="sm" className="hidden shrink-0 sm:block" />
      </div>
    </header>
  );
}
