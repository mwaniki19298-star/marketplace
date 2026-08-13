import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunken">
        <Icon className="h-5 w-5 text-ink-faint" aria-hidden="true" />
      </div>
      <div className="max-w-xs space-y-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-sm text-ink-faint">{description}</p>
      </div>
      {action}
    </div>
  );
}
