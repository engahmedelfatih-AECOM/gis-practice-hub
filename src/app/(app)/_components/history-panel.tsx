import type { AuditRow } from "@/application/audit/read";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

/** Decision/change history for one record, shown on detail screens (plan §12). */
export function HistoryPanel({ rows }: { rows: AuditRow[] }) {
  return (
    <Card className="self-start">
      <CardHeader title="History" description="Who changed what, and when." />
      <CardBody className="p-0">
        {rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-600">No changes recorded yet.</p>
        ) : (
          <ol className="divide-border divide-y">
            {rows.map((r) => (
              <li key={r.id} className="px-5 py-3 text-sm">
                <p className="font-medium">
                  {r.action
                    .split(".")
                    .pop()
                    ?.replace(/([A-Z])/g, " $1")
                    .toLowerCase()}
                </p>
                <p className="text-xs text-gray-600">
                  {r.actorName ?? "system"} · {formatDateTime(r.occurredAt)}
                </p>
                <ChangeSummary before={r.before} after={r.after} />
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}

const HIDDEN = new Set(["id", "version", "createdAt", "updatedAt", "password"]);

function ChangeSummary({ before, after }: { before: unknown; after: unknown }) {
  if (!isRecord(before) || !isRecord(after)) return null;
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter(
    (k) => !HIDDEN.has(k) && JSON.stringify(before[k]) !== JSON.stringify(after[k]),
  );
  if (!keys.length) return null;
  return (
    <ul className="mt-1 space-y-0.5 text-xs text-gray-700">
      {keys.slice(0, 8).map((k) => (
        <li key={k}>
          <span className="font-medium">{k}</span>: {show(before[k])} → {show(after[k])}
        </li>
      ))}
      {keys.length > 8 ? <li>… {keys.length - 8} more</li> : null}
    </ul>
  );
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const show = (v: unknown) =>
  v === null || v === undefined ? "-" : typeof v === "object" ? JSON.stringify(v) : String(v);
