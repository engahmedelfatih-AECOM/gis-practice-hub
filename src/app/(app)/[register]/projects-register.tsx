import Link from "next/link";
import { DESIGN_STAGE_CODES } from "@/domain/shared/enums";
import type { ProjectView } from "@/application/hub/views";
import type { PeriodView } from "@/application/hub/periods";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PeriodSelect } from "@/components/hub/period-select";
import { RowKeys, RowKeysHint } from "@/components/hub/row-keys";
import { toneClass } from "@/components/hub/tones";
import { DeleteRowForm } from "./delete-row-form";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

/** The Projects register with the calculated columns of the sheet (dark headers). */
export function ProjectsRegister({
  view,
  canAdd,
  saved,
  deleted = false,
  exportHref,
  deleteNotes = null,
}: {
  view: { rows: ProjectView[]; period: PeriodView | null; periods: PeriodView[] };
  canAdd: boolean;
  saved: boolean;
  deleted?: boolean;
  exportHref: string;
  /** Usage note per project id for the bin icon; null when this role may not delete projects. */
  deleteNotes?: Record<string, string | null> | null;
}) {
  const th = (label: string, dark = false) => (
    <th key={label} className={cn("px-2 py-2 font-semibold whitespace-nowrap", dark ? "bg-midnight-teal" : "bg-earth-green")}>
      {label}
    </th>
  );
  return (
    <>
      <PageHeader
        title="Projects"
        description="One row per project - this is the master record. Green headers = you edit; dark headers = calculated automatically."
        crumbs={[{ label: "Registers" }, { label: "Projects" }]}
        actions={
          <>
            <PeriodSelect periods={view.periods} selected={view.period?.id ?? ""} basePath="/projects" />
            <ButtonLink href={exportHref} variant="secondary">
              Export to Excel
            </ButtonLink>
            {canAdd ? (
              <ButtonLink href="/projects/numbers" variant="secondary">
                Project numbers
              </ButtonLink>
            ) : null}
            {canAdd ? <ButtonLink href="/projects/new">New project</ButtonLink> : null}
          </>
        }
      />
      {saved ? <Alert tone="ok" className="mb-4">Project saved.</Alert> : null}
      {deleted ? <Alert tone="ok" className="mb-4">Project deleted.</Alert> : null}
      <RowKeys className="sheet-scroll border-border bg-surface w-full rounded-lg border">
        <table className="sheet-table w-full text-left text-xs">
          <thead className="text-white">
            <tr>
              {th("#")}
              {th("Project Name")}
              {th("Client")}
              {th("Job No.")}
              {th("Project Number")}
              {th("Current Design Stage")}
              {th("Project Status")}
              {th("GIS Lead")}
              {th("GIS Resources Region", true)}
              {DESIGN_STAGE_CODES.map((c) => th(c))}
              {th("QA/QC")}
              {th("RFI Log")}
              {th("CRS Open")}
              {th("CRS In Review")}
              {th("CRS Closed")}
              {th("CRS Total", true)}
              {th("RFI Open", true)}
              {th("RFI Closed", true)}
              {th("RFI Total", true)}
              {th("GIS Delivered / Approved", true)}
              {th("GIS In Progress", true)}
              {th("Next Milestone", true)}
              {th("Milestone Override")}
              {th("Next Milestone Date", true)}
              {th("Utilisation %", true)}
              {th("Submissions This Period", true)}
              {th("Last Updated")}
              {th("Remarks")}
              {th("Share Folder")}
              {th("Update page", true)}
              {deleteNotes ? (
                <th className="bg-earth-green px-2 py-2">
                  <span className="sr-only">Delete</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {view.rows.map((p, i) => (
              <tr key={p.id} data-row data-href={`/projects/${p.id}`} tabIndex={i === 0 ? 0 : -1} aria-label={`Row ${i + 1}, ${p.name}`} className="hover:bg-stone-gray-25 align-top">
                <td className="px-2 py-1.5 text-gray-500">{i + 1}</td>
                <td className="px-2 py-1.5 font-medium whitespace-nowrap">
                  <Link href={`/projects/${p.id}/edit`} className="text-brand-link hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-2 py-1.5">{p.client}</td>
                <td className="px-2 py-1.5">{p.jobNo}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{p.projectNumber}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{p.currentDesignStage}</td>
                <td className="px-2 py-1.5">
                  <span className={cn("inline-block rounded px-1.5 py-0.5 whitespace-nowrap", toneClass(p.status))}>{p.status}</span>
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">{p.gisLead}</td>
                <td className="bg-stone-gray-25 px-2 py-1.5 whitespace-nowrap">{p.region}</td>
                {DESIGN_STAGE_CODES.map((c) => (
                  <td key={c} className="px-1 py-1.5 text-center">
                    <span className={cn("inline-block rounded px-1 py-0.5 text-[10px] font-medium", toneClass(p.stageStates[c]))}>{p.stageStates[c] ?? ""}</span>
                  </td>
                ))}
                <td className="px-2 py-1.5">{p.qaqcChecklistUrl ? <a href={p.qaqcChecklistUrl} className="text-brand-link hover:underline">Open</a> : ""}</td>
                <td className="px-2 py-1.5">{p.rfiLogUrl ? <a href={p.rfiLogUrl} className="text-brand-link hover:underline">Open</a> : ""}</td>
                <td className="px-2 py-1.5 text-center">{p.crsOpen}</td>
                <td className="px-2 py-1.5 text-center">{p.crsInReview}</td>
                <td className="px-2 py-1.5 text-center">{p.crsClosed}</td>
                <td className="bg-stone-gray-25 px-2 py-1.5 text-center">{p.crsTotal}</td>
                <td className="bg-stone-gray-25 px-2 py-1.5 text-center">{p.rfi.open}</td>
                <td className="bg-stone-gray-25 px-2 py-1.5 text-center">{p.rfi.closed}</td>
                <td className="bg-stone-gray-25 px-2 py-1.5 text-center">{p.rfi.total}</td>
                <td className="bg-stone-gray-25 max-w-64 px-2 py-1.5">{p.delivered || "-"}</td>
                <td className="bg-stone-gray-25 max-w-64 px-2 py-1.5">{p.inProgress || "-"}</td>
                <td className="bg-stone-gray-25 max-w-56 px-2 py-1.5">{p.milestone.text}</td>
                <td className="px-2 py-1.5">{p.milestoneOverride}</td>
                <td className="bg-stone-gray-25 px-2 py-1.5 whitespace-nowrap">{p.milestone.date ? formatDate(p.milestone.date) : ""}</td>
                <td className="bg-stone-gray-25 px-2 py-1.5 text-center">{p.utilisation === null ? "" : `${p.utilisation} %`}</td>
                <td className="bg-stone-gray-25 px-2 py-1.5 text-center">{p.submissionsThisPeriod}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{formatDate(p.lastUpdated)}</td>
                <td className="max-w-56 px-2 py-1.5">{p.remarks}</td>
                <td className="px-2 py-1.5">{p.dataShareFolderUrl ? <a href={p.dataShareFolderUrl} className="text-brand-link hover:underline">Open</a> : ""}</td>
                <td className="bg-stone-gray-25 px-2 py-1.5 whitespace-nowrap">
                  <Link href={`/projects/${p.id}`} className="text-brand-link font-medium hover:underline">
                    Open report
                  </Link>
                </td>
                {deleteNotes ? (
                  <td className="px-1 py-1 whitespace-nowrap">
                    <DeleteRowForm register="projects" id={p.id} name={p.name} usedBy={deleteNotes[p.id] ?? null} />
                  </td>
                ) : null}
              </tr>
            ))}
            {view.rows.length === 0 ? (
              <tr>
                <td colSpan={40} className="px-4 py-8 text-center text-sm text-gray-500">
                  No projects yet. Add one or import the workbook under Administration.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </RowKeys>
      {view.rows.length > 1 ? <RowKeysHint /> : null}
    </>
  );
}
