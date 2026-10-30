import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section className={cn("border-border bg-surface rounded-lg border", className)} {...props} />
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "border-border flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4",
        className,
      )}
    >
      <div>
        <h2 className="text-foreground text-base font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-gray-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="tabular text-foreground mt-1 text-3xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </>
  );
  return href ? (
    <a
      href={href}
      className="border-border bg-surface hover:border-brand-green block rounded-lg border p-5"
    >
      {body}
    </a>
  ) : (
    <div className="border-border bg-surface rounded-lg border p-5">{body}</div>
  );
}
