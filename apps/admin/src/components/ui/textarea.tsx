import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
      "focus:outline-none focus:ring-2 focus:ring-primary/30",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
