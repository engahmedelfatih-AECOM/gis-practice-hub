import Link from "next/link";
import type { FieldDef } from "@/domain/hub/registers";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { toneClass } from "./tones";

export interface ExtraColumn {
  label: string;
  value: (row: Record<string, unknown>) => string | number;
}

function cellText(f: FieldDef, row: Record<string, unknown>): string {
  const v = row[f.key];
  if (v === null || v === undefined || v === "") return "";
  if (f.type === "date") return formatDate(String(v));
  if (f.type === "pct") return `${v} %`;
  if (f.type === "project") return String(row.projectName ?? "");
  return String(v);
}

/**
 * The sheet as a table: one column per field in sheet order (plus the calculated extras),
 * the workbook colours on status cells, and an edit link per row.
 */
export function RegisterTable({
  fields,
  rows,
  extras = [],
  editHref,
  rowLabel,
  startNumber = 1,
}: {
  fields: FieldDef[];
  rows: Record<string, unknown>[];
  extras?: ExtraColumn[];
  editHref: (row: Record<string, unknown>) => string;
  rowLabel?: (row: Record<string, unknown>) => string;
  /** Number of the first row on this page, so "#" keeps counting across pages. */
  startNumber?: number;
}) {
  // Calculated columns are shown once, as extras, not as an empty stored column.
  const columns = fields.filter((f) => !f.derived);
  return (
    <div className="border-border bg-surface w-full overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-xs">
        <thead className="bg-earth-green text-white">
          <tr>
            <th className="px-2 py-2 font-semibold whitespace-nowrap">#</th>
            {columns.map((f) => (
              <th key={f.key} className="px-2 py-2 font-semibold whitespace-nowrap">
                {f.label}
              </th>
            ))}
            {extras.map((e) => (
              <th key={e.label} className="bg-midnight-teal px-2 py-2 font-semibold whitespace-nowrap">
                {e.label}
              </th>
            ))}
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {rows.map((row, i) => (
            <tr key={String(row.id)} className="hover:bg-stone-gray-25 align-top">
              <td className="px-2 py-1.5 text-gray-500">{startNumber + i}</td>
              {columns.map((f) => {
                const text = cellText(f, row);
                const tone = f.type === "select" ? toneClass(text) : "";
                return (
                  <td key={f.key} className={cn("max-w-72 px-2 py-1.5", tone ? "rounded-sm font-medium" : "")}>
                    {f.type === "url" && text ? (
                      <a href={text} target="_blank" rel="noopener noreferrer" className="text-brand-link hover:underline">
                        Open
                      </a>
                    ) : tone ? (
                      <span className={cn("inline-block rounded px-1.5 py-0.5 whitespace-nowrap", tone)}>{text}</span>
                    ) : (
                      <span className="line-clamp-3">{text}</span>
                    )}
                  </td>
                );
              })}
              {extras.map((e) => {
                const v = String(e.value(row));
                const tone = toneClass(v);
                return (
                  <td key={e.label} className="bg-stone-gray-25 px-2 py-1.5 whitespace-nowrap">
                    {tone ? <span className={cn("inline-block rounded px-1.5 py-0.5", tone)}>{v}</span> : v}
                  </td>
                );
              })}
              <td className="px-2 py-1.5 whitespace-nowrap">
                <Link href={editHref(row)} className="text-brand-link font-medium hover:underline" aria-label={`Edit ${rowLabel?.(row) ?? "row"}`}>
                  Edit
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={fields.length + extras.length + 2} className="px-4 py-8 text-center text-sm text-gray-500">
                No rows yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
