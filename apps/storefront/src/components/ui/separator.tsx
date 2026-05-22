import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Separator({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("h-px w-full bg-muted", className)} {...p} />;
}
