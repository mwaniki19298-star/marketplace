import { BadgeCheck, CircleDashed, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import type { VerificationLevel } from "@/types";

// One consistent icon + label per level so trust always reads the same way,
// wherever it appears (store header, product card, seller list). We never
// imply the platform guarantees a transaction — copy stays scoped to
// "verified by Marketplace", never "guaranteed".
const LEVELS: Record<
  VerificationLevel,
  { label: string; icon: typeof CircleDashed; className: string }
> = {
  new_seller: {
    label: "New seller",
    icon: CircleDashed,
    className: "text-ink-faint",
  },
  verified_identity: {
    label: "Verified identity",
    icon: BadgeCheck,
    className: "text-accent",
  },
  verified_community: {
    label: "Community verified",
    icon: ShieldCheck,
    className: "text-accent",
  },
  trusted_seller: {
    label: "Trusted seller",
    icon: Sparkles,
    className: "text-accent-strong",
  },
};

interface VerificationBadgeProps {
  level: VerificationLevel;
  showLabel?: boolean;
  className?: string;
}

export function VerificationBadge({ level, showLabel = true, className }: VerificationBadgeProps) {
  const { label, icon: Icon, className: iconClass } = LEVELS[level];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-ink-soft", className)}>
      <Icon className={cn("h-3.5 w-3.5", iconClass)} aria-hidden="true" strokeWidth={2.25} />
      {showLabel && <span>{label}</span>}
    </span>
  );
}
