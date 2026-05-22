import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Badge({ className, ...p }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-block rounded-full bg-muted px-3 py-1 text-xs font-body font-medium text-muted-foreground",
        className,
      )}
      {...p}
    />
  );
}
