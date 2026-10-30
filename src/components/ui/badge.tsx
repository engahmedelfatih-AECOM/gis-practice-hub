import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-status-neutral-bg text-status-neutral",
        ok: "bg-status-ok-bg text-status-ok",
        warn: "bg-status-warn-bg text-status-warn",
        danger: "bg-status-danger-bg text-status-danger",
        info: "bg-status-info-bg text-status-info",
        brand: "bg-brand-primary text-brand-white",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? "ok" : "neutral"}>{active ? "Active" : "Inactive"}</Badge>;
}

const PROJECT_STATUS_TONE: Record<string, BadgeTone> = {
  PROSPECT: "info",
  ACTIVE: "ok",
  ON_HOLD: "warn",
  CLOSED: "neutral",
  CANCELLED: "danger",
};

export function ProjectStatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ").toLowerCase();
  return (
    <Badge tone={PROJECT_STATUS_TONE[status] ?? "neutral"} className="capitalize">
      {label}
    </Badge>
  );
}
