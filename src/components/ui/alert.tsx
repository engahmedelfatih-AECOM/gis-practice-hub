import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const alertVariants = cva("rounded-md border px-4 py-3 text-sm", {
  variants: {
    tone: {
      info: "border-brand-teal/40 bg-status-info-bg text-status-info",
      ok: "border-brand-green/50 bg-status-ok-bg text-status-ok",
      warn: "border-brand-amber/60 bg-status-warn-bg text-status-warn",
      danger: "border-brand-red/40 bg-status-danger-bg text-status-danger",
    },
  },
  defaultVariants: { tone: "info" },
});

export function Alert({
  className,
  tone,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role={tone === "danger" || tone === "warn" ? "alert" : "status"}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    />
  );
}
