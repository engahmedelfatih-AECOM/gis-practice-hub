import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const base =
  "block w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground placeholder:text-gray-400 disabled:bg-gray-100 aria-invalid:border-brand-red";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(base, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(base, "min-h-24 py-2", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(base, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn("border-border accent-brand-green h-4 w-4 rounded", className)}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("block text-sm font-medium text-gray-800", className)} {...props} />;
}
