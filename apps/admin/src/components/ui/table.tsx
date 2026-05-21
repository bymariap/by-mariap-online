import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Table = ({
  className,
  ...p
}: HTMLAttributes<HTMLTableElement>) => (
  <table className={cn("w-full text-sm", className)} {...p} />
);
export const THead = ({
  className,
  ...p
}: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("bg-muted text-left", className)} {...p} />
);
export const TBody = (p: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody {...p} />
);
export const TR = ({
  className,
  ...p
}: HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b border-border", className)} {...p} />
);
export const TH = ({
  className,
  ...p
}: HTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn("px-3 py-2 font-medium", className)} {...p} />
);
export const TD = ({
  className,
  ...p
}: HTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-3 py-2", className)} {...p} />
);
