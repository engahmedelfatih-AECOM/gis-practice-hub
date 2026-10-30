import type { Metadata } from "next";
import { requireActor } from "@/application/auth/actor";
import { listAudit } from "@/application/audit/read";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { guarded } from "@/app/_lib/page-guard";
import { param, type SearchParams } from "@/app/_lib/actions";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return guarded(async () => {
    const actor = await requireActor();
    const filter = {
      entityType: param(sp, "entityType"),
      entityId: param(sp, "entityId"),
      action: param(sp, "action"),
      from: param(sp, "from"),
      to: param(sp, "to"),
      page: param(sp, "page") ?? undefined,
      pageSize: 50,
    };
    const page = await listAudit(actor, filter);
    const makeHref = (p: number) => {
      const u = new URLSearchParams();
      for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) u.set(k, v);
      u.set("page", String(p));
      return `/admin/audit?${u.toString()}`;
    };
    return (
      <>
        <PageHeader
          title="Audit log"
          description="Append-only record of every change, sign-in-related event and role change."
          crumbs={[{ label: "Administration" }, { label: "Audit log" }]}
        />
        <form method="get" className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <Label htmlFor="entityType" className="mb-1">
              Entity type
            </Label>
            <Input
              id="entityType"
              name="entityType"
              defaultValue={filter.entityType ?? ""}
              placeholder="employee"
            />
          </div>
          <div>
            <Label htmlFor="entityId" className="mb-1">
              Entity id
            </Label>
            <Input id="entityId" name="entityId" defaultValue={filter.entityId ?? ""} />
          </div>
          <div>
            <Label htmlFor="action" className="mb-1">
              Action
            </Label>
            <Input
              id="action"
              name="action"
              defaultValue={filter.action ?? ""}
              placeholder="employee.update"
            />
          </div>
          <div>
            <Label htmlFor="from" className="mb-1">
              From
            </Label>
            <Input id="from" name="from" type="date" defaultValue={filter.from ?? ""} />
          </div>
          <div>
            <Label htmlFor="to" className="mb-1">
              To
            </Label>
            <Input id="to" name="to" type="date" defaultValue={filter.to ?? ""} />
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          </div>
        </form>
        {page.items.length === 0 ? (
          <EmptyState title="No audit entries" description="Nothing matches these filters." />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <TH>When</TH>
                  <TH>Actor</TH>
                  <TH>Action</TH>
                  <TH>Entity</TH>
                  <TH>Change</TH>
                </tr>
              </THead>
              <TBody>
                {page.items.map((r) => (
                  <TR key={r.id}>
                    <TD className="tabular whitespace-nowrap text-gray-600">
                      {formatDateTime(r.occurredAt)}
                    </TD>
                    <TD>{r.actorName ?? <span className="text-gray-500">system</span>}</TD>
                    <TD className="font-mono text-xs">{r.action}</TD>
                    <TD className="font-mono text-xs">
                      {r.entityType}
                      {r.entityId ? (
                        <span className="text-gray-500"> {r.entityId.slice(0, 8)}…</span>
                      ) : null}
                    </TD>
                    <TD className="max-w-md">
                      <details>
                        <summary className="text-brand-link cursor-pointer text-xs">Show</summary>
                        <pre className="mt-1 max-h-64 overflow-auto rounded bg-gray-50 p-2 text-[11px] leading-snug">
                          {JSON.stringify({ before: r.before, after: r.after }, null, 1)}
                        </pre>
                      </details>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination
              page={page.page}
              pageSize={page.pageSize}
              total={page.total}
              makeHref={makeHref}
            />
          </>
        )}
      </>
    );
  });
}
