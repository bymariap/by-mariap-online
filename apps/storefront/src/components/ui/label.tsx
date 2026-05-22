import { LabelHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "block text-xs font-body font-medium text-muted-foreground uppercase tracking-wide mb-1",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";
