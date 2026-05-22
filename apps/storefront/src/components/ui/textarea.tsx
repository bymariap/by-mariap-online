import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full bg-transparent border-b border-border py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors resize-none disabled:opacity-50",
      className,
    )}
    rows={3}
    {...props}
  />
));
Textarea.displayName = "Textarea";
