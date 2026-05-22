import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "w-full bg-transparent border-b border-border py-2 text-sm font-body text-foreground focus:outline-none focus:border-accent transition-colors disabled:opacity-50 cursor-pointer",
      className,
    )}
    {...props}
  />
));
Select.displayName = "Select";
