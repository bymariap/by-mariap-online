"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

interface QuantityInputProps {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function QuantityInput({
  value,
  onChange,
  min = 1,
  max = 99,
  className,
}: QuantityInputProps) {
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Reducir"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
      <span className="w-6 text-center text-sm font-body select-none">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Aumentar"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
