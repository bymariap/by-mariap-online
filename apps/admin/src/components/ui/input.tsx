import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-md border border-border bg-background px-3 text-sm",
      "focus:outline-none focus:ring-2 focus:ring-primary/30",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
