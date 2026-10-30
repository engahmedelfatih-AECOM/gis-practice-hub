import Link from "next/link";
import { cn } from "@/lib/cn";

export function Pagination({
  page,
  pageSize,
  total,
  makeHref,
}: {
  page: number;
  pageSize: number;
  total: number;
  makeHref: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const linkCls = "rounded-md border border-border px-3 py-1.5 text-sm hover:bg-gray-100";
  return (
    <nav
      className="mt-4 flex items-center justify-between text-sm text-gray-600"
      aria-label="Pagination"
    >
      <span className="tabular">
        Showing {from}-{to} of {total}
      </span>
      <div className="flex gap-2">
        <Link
          aria-disabled={page <= 1}
          className={cn(linkCls, page <= 1 && "pointer-events-none opacity-40")}
          href={makeHref(Math.max(1, page - 1))}
        >
          Previous
        </Link>
        <span className="tabular px-2 py-1.5">
          Page {page} of {pages}
        </span>
        <Link
          aria-disabled={page >= pages}
          className={cn(linkCls, page >= pages && "pointer-events-none opacity-40")}
          href={makeHref(Math.min(pages, page + 1))}
        >
          Next
        </Link>
      </div>
    </nav>
  );
}
