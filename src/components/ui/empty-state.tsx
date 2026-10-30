import { Inbox } from "lucide-react";

/** Every list and dashboard tile uses this when there is nothing to show (plan §9). */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-border bg-surface flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center">
      <Inbox className="h-8 w-8 text-gray-400" aria-hidden />
      <h3 className="text-foreground mt-3 text-sm font-semibold">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-gray-600">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
