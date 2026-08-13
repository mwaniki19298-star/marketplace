import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

interface RatingStarsProps {
  rating: number; // 0-5
  reviewCount?: number;
  size?: "sm" | "md";
  className?: string;
}

export function RatingStars({ rating, reviewCount, size = "sm", className }: RatingStarsProps) {
  const starSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Star className={cn(starSize, "fill-warning text-warning")} aria-hidden="true" />
      <span className={cn("font-medium text-ink", size === "sm" ? "text-xs" : "text-sm")}>
        {rating.toFixed(1)}
      </span>
      {reviewCount !== undefined && (
        <span className={cn("text-ink-faint", size === "sm" ? "text-xs" : "text-sm")}>
          ({reviewCount})
        </span>
      )}
    </span>
  );
}
