import type { Metadata } from "next";
import Link from "next/link";
import { requireActor } from "@/application/auth/actor";
import { projectPage } from "@/application/hub/views";
import { can } from "@/domain/authz/policy";
import { UPDATE_TYPES, UPDATE_TYPE_BLOCKS } from "@/domain/shared/enums";
import { stageCode } from "@/domain/hub/rules";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { PeriodSelect } from "@/components/hub/period-select";
import { toneClass } from "@/components/hub/tones";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { guarded } from "@/app/_lib/page-guard";
import { param, type Params, type SearchParams } from "@/app/_lib/actions";
import { WorkflowBand } from "./workflow-band";
import { AppsBox } from "./apps-box";

export const metadata: Metadata = { title: "Project update" };

/**
 * The project update page: the same page as the report sheet of the workbook, built from the
 * registers for the selected period. Nothing is typed here except the applications box and
 * the workflow steps.
 */
export default async function ProjectReportPage({ params, searchParams }: { params: Params<{ id: string }>; searchParams: SearchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  return guarded(async () => {
    const actor = await requireActor();
    const page = await projectPage(actor, id, param(sp, "period"));
    const p = page.project;
    const canWorkflow = can(actor, "workflow:manage");
    const periodQuery = page.period ? `?period=${page.period.id}` : "";
    return (
      <div className="space-y-5">
        {param(sp, "created") ? <Alert tone="ok">Project created. Its update page, workflow and tracker are ready; add packages and resources next.</Alert> : null}
        {/* Header band */}
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-surface p-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              PROJECT UPDATE - {p.name.toUpperCase()}
              {p.client ? ` (${p.client.toUpperCase()})` : ""}
            </h1>
            <p className="mt-1 text-sm text-gray-600">GIS Practice | Bi-weekly report | {page.period?.label ?? "no period selected"}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PeriodSelect periods={page.periods} selected={page.period?.id ?? ""} basePath={`/projects/${p.id}`} />
              <ButtonLink href={`/delivery-tracker?project=${p.id}`} variant="secondary" size="sm">
                Delivery Tracker
              </ButtonLink>
              <ButtonLink href={`/api/export/report/${p.id}${periodQuery}&format=xlsx`.replace("?&", "?").replace(`${p.id}&`, `${p.id}?`)} variant="secondary" size="sm">
                Export Excel
              </ButtonLink>
              <ButtonLink href={`/api/export/report/${p.id}${periodQuery ? `${periodQuery}&` : "?"}format=pdf`} variant="secondary" size="sm">
                Export PDF
              </ButtonLink>
              {can(actor, "project:manage") ? (
                <ButtonLink href={`/projects/${p.id}/edit`} variant="secondary" size="sm">
                  Edit project
                </ButtonLink>
              ) : null}
            </div>
          </div>
          <div className={cn("min-w-48 rounded-md px-5 py-3 text-center", toneClass(p.status) || "bg-stone-gray-25")}>
            <p className="text-xs tracking-wide uppercase opacity-80">Status</p>
            <p className="text-xl font-bold">{p.status.toUpperCase()}</p>
          </div>
        </div>

        {/* Tiles */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Tile label="Client" value={p.client ?? "-"} />
          <Tile label="Design stage" value={stageCode(p.currentDesignStage) || "-"} />
          <Tile label="Report period" value={page.period ? `${formatDate(page.period.startDate)} - ${formatDate(page.period.endDate)}` : "-"} />
          <Tile label="GIS lead / hub" value={`${p.gisLead ?? "-"} - ${p.region}`} />
          <Tile label="QA/QC checklists" value={`${page.qaqc.checklists} checklists, ${page.qaqc.pass} pass, ${page.qaqc.fail} fail`} />
          <Tile label="RFI log" value={`${p.rfi.open} open (${p.rfi.overdue} overdue), ${p.rfi.closed} closed`} />
        </div>

        {/* Packages and resources */}
        <div className="grid gap-5 lg:grid-cols-3">
          <Section title="GIS Data Delivered / Approved">
            <MiniTable
              head={["Stage", "Discipline", "Package", "Status"]}
              rows={page.delivered.map((x) => [stageCode(x.designStage), x.discipline, x.description ?? "", x.status])}
              toneCol={3}
            />
          </Section>
          <Section title="GIS Data In Progress">
            <MiniTable
              head={["Stage", "Discipline", "Package", "Status"]}
              rows={page.inProgress.map((x) => [stageCode(x.designStage), x.discipline, x.description ?? "", x.status])}
              toneCol={3}
            />
          </Section>
          <Section title="GIS Resources on Project">
            <MiniTable head={["Name", "Role", "Hub"]} rows={page.resources.map((r) => [r.name, r.role ?? "", r.hub ?? ""])} />
          </Section>
        </div>

        {/* The three update blocks */}
        <div className="grid gap-5 lg:grid-cols-3">
          {UPDATE_TYPES.map((t) => (
            <Section key={t} title={UPDATE_TYPE_BLOCKS[t]} action={can(actor, "update:manage") ? <Link href={`/updates/new?project=${p.id}`} className="text-brand-link text-xs hover:underline">Add</Link> : null}>
              {page.blocks[t].length ? (
                <ol className="space-y-2 text-sm">
                  {page.blocks[t].map((u, i) => (
                    <li key={u.id} className="flex gap-2">
                      <span className="text-gray-400">{i + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <p>{u.description}</p>
                        {u.mitigation ? <p className="text-xs text-gray-600">Mitigation: {u.mitigation}</p> : null}
                        <p className="mt-0.5 text-xs text-gray-500">
                          {u.owner ? `${u.owner}` : ""}
                          {u.dueDate ? ` - due ${formatDate(u.dueDate)}` : ""}
                        </p>
                      </div>
                      {u.rag ? <span className={cn("h-fit rounded px-1.5 py-0.5 text-xs font-medium", toneClass(u.rag))}>{u.rag}</span> : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-gray-500">No items for this period.</p>
              )}
            </Section>
          ))}
        </div>

        {/* Trackers, stage progress, applications */}
        <div className="grid gap-5 lg:grid-cols-3">
          <Section title="Tracker">
            <MiniTable
              head={["Tracker", "Open", "In Review", "Closed", "Total"]}
              rows={[
                ["Client Comments (CRS)", String(p.crsOpen), String(p.crsInReview), String(p.crsClosed), String(p.crsTotal)],
                ["RFIs to Disciplines", String(p.rfi.open), "-", String(p.rfi.closed), String(p.rfi.total)],
              ]}
            />
            {page.risks.length ? (
              <p className="mt-2 text-xs text-gray-600">
                {page.risks.length} open risk{page.risks.length === 1 ? "" : "s"} - <Link href={`/risks?project=${p.id}`} className="text-brand-link hover:underline">see Risks</Link>
              </p>
            ) : null}
          </Section>
          <Section title="Design Stage Progress">
            <p className="mb-2 text-xs text-gray-500">Set on the Projects register (MP to IFC columns).</p>
            <div className="flex flex-wrap gap-1">
              {page.stageChips.map((c) => (
                <span key={c.code} className={cn("rounded px-2 py-1 text-xs font-semibold", toneClass(c.state) || "bg-black-10 text-gray-500")} title={c.state || "not set"}>
                  {c.code}
                </span>
              ))}
            </div>
          </Section>
          <Section title="GIS Enterprise Applications">
            <AppsBox projectId={p.id} apps={page.apps} canEdit={canWorkflow} />
          </Section>
        </div>

        <WorkflowBand projectId={p.id} steps={page.workflow} canEdit={canWorkflow} />
      </div>
    );
  });
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-earth-green rounded-md px-3 py-2 text-white">
      <p className="text-[11px] tracking-wide uppercase opacity-80">{label}</p>
      <p className="text-sunrise-yellow mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border-border bg-surface rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-brand-green-deep text-sm font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function MiniTable({ head, rows, toneCol }: { head: string[]; rows: string[][]; toneCol?: number }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-earth-green text-white">
          {head.map((h) => (
            <th key={h} className="px-2 py-1 text-left font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-border divide-y">
        {rows.length ? (
          rows.map((r, i) => (
            <tr key={i} className="odd:bg-stone-gray-25">
              {r.map((c, j) => (
                <td key={j} className="px-2 py-1 align-top">
                  {toneCol === j && c ? <span className={cn("inline-block rounded px-1.5 py-0.5 whitespace-nowrap", toneClass(c))}>{c}</span> : c}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={head.length} className="px-2 py-2 text-gray-500">
              -
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
