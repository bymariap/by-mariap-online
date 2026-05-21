import { ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={() => onOpenChange(false)}
      className={cn(
        "rounded-lg p-0 backdrop:bg-black/40 w-full max-w-lg",
        className,
      )}
    >
      <div className="p-6 space-y-4">
        <header className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            ✕
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
