import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "accent";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground",
  accent: "bg-accent-container text-accent-container-foreground",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...p }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-3 py-1 text-xs font-body font-medium",
        variantClasses[variant],
        className,
      )}
      {...p}
    />
  );
}
