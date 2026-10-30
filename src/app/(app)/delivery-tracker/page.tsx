import type { Metadata } from "next";
import Link from "next/link";
import { requireActor } from "@/application/auth/actor";
import { listProjectsBrief } from "@/application/hub/project-extras";
import { deliveryTracker } from "@/application/hub/views";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectSelect } from "@/components/hub/project-select";
import { toneClass } from "@/components/hub/tones";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { guarded } from "@/app/_lib/page-guard";
import { param, type SearchParams } from "@/app/_lib/actions";

export const metadata: Metadata = { title: "Delivery Tracker" };

const HEAD = ["#", "Discipline (stage)", "Design Approval Date", "GIS Start Date", "Planned Submission", "Actual Submission", "Assigned Staff", "QA/QC", "GIS Status", "Client Review Status", "Client Comment Ref. No.", "Revision No.", "Re-Submission Date", "Client Final Approval Date", "Days Overdue", "Progress (%)", "Remarks / Notes"];

/** The one-page GIS submission tracker (Laheq layout) for the project chosen in the selector. */
export default async function DeliveryTrackerPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return guarded(async () => {
    const actor = await requireActor();
    const projects = await listProjectsBrief();
    const projectId = param(sp, "project") ?? projects[0]?.id ?? null;
    if (!projectId) {
      return (
        <>
          <PageHeader title="Delivery Tracker" crumbs={[{ label: "Registers" }, { label: "Delivery Tracker" }]} />
          <Alert tone="info">Register a project first.</Alert>
        </>
      );
    }
    const t = await deliveryTracker(actor, projectId);
    const s = t.summary;
    return (
      <div className="space-y-4">
        <PageHeader
          title={`GIS SUBMISSION TRACKER - ${t.project.name.toUpperCase()}`}
          description={`Client: ${t.project.client ?? "-"} | GIS lead: ${t.gisLead ?? "-"} | All disciplines - one row per package from the Packages register`}
          crumbs={[{ label: "Registers" }, { label: "Delivery Tracker" }]}
          actions={
            <>
              <ProjectSelect projects={projects} selected={projectId} basePath="/delivery-tracker" />
              <ButtonLink href={`/api/export/tracker/${projectId}?format=xlsx`} variant="secondary">
                Export Excel
              </ButtonLink>
              <ButtonLink href={`/api/export/tracker/${projectId}?format=pdf`} variant="secondary">
                Export PDF
              </ButtonLink>
            </>
          }
        />
        <div className="grid gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
          <Meta label="Project" value={t.project.name} strong />
          <Meta label="Client" value={t.project.client ?? "-"} />
          <Meta label="Consultant" value="AECOM" />
          <Meta label="Prepared by" value="GIS Practice" />
          <Meta label="Date" value={formatDate(t.today)} />
          <Meta label="Status" value="Live" />
        </div>
        <p className="text-xs text-gray-600">NOTE: GIS activities commence only upon receipt of the design approval from the discipline. Rows come from the Packages register for the selected project; edit them there.</p>
        <div className="border-border bg-surface overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-midnight-teal text-white">
              <tr>
                {HEAD.map((h) => (
                  <th key={h} className="px-2 py-2 text-left font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {t.rows.map((r) => (
                <tr key={r.id} className="odd:bg-stone-gray-25">
                  <td className="px-2 py-1.5">{r.n}</td>
                  <td className="px-2 py-1.5 font-medium whitespace-nowrap">{r.disciplineStage}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{formatDate(r.designApprovalDate)}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{formatDate(r.gisStartDate)}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{formatDate(r.plannedSubmission)}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{formatDate(r.actualSubmission)}</td>
                  <td className="px-2 py-1.5">{r.assignedTo ?? "-"}</td>
                  <td className="px-2 py-1.5">
                    <Badge value={r.qaqcResult} />
                  </td>
                  <td className="px-2 py-1.5">
                    <Badge value={r.status} />
                  </td>
                  <td className="px-2 py-1.5">
                    <Badge value={r.clientReviewStatus} />
                  </td>
                  <td className="px-2 py-1.5">{r.clientCommentRef ?? "-"}</td>
                  <td className="px-2 py-1.5">{r.revisionNo ?? "-"}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{formatDate(r.resubmissionDate)}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{formatDate(r.approvalDate)}</td>
                  <td className={cn("px-2 py-1.5 text-center font-semibold", r.daysOverdue ? "text-brand-red-deep" : "")}>{r.daysOverdue ?? "-"}</td>
                  <td className="px-2 py-1.5 text-center">{r.progressPct} %</td>
                  <td className="max-w-56 px-2 py-1.5">{r.remarks}</td>
                  <td className="px-2 py-1.5">
                    <Link href={`/packages/${r.id}`} className="text-brand-link hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {t.rows.length === 0 ? (
                <tr>
                  <td colSpan={HEAD.length + 1} className="px-4 py-8 text-center text-gray-500">
                    No packages for this project yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="grid gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
          <Total label="Total packages" value={s.total} />
          <Total label="Approved" value={s.approved} tone="Approved" />
          <Total label="Submitted" value={s.submitted} tone="Submitted" />
          <Total label="In progress" value={s.inProgress} tone="In Progress" />
          <Total label="Not started" value={s.notStarted} tone="Not Started" />
          <Total label="Overall progress" value={`${s.overallProgress} %`} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <span className="font-semibold">Legend</span>
          {["Submitted", "In Progress", "Approved", "Client Comments", "On Hold", "Not Started"].map((v) => (
            <span key={v} className={cn("rounded px-1.5 py-0.5", toneClass(v))}>
              {v}
            </span>
          ))}
        </div>
      </div>
    );
  });
}

function Meta({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="border-border bg-surface rounded border px-2 py-1">
      <span className="text-gray-500">{label}: </span>
      <span className={strong ? "text-brand-green-deep font-bold" : ""}>{value}</span>
    </div>
  );
}

function Total({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className={cn("rounded px-3 py-2", tone ? toneClass(tone) : "bg-earth-green text-white")}>
      <p className="text-[11px] uppercase opacity-90">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function Badge({ value }: { value: string | null }) {
  if (!value) return <span>-</span>;
  return <span className={cn("inline-block rounded px-1.5 py-0.5 whitespace-nowrap", toneClass(value))}>{value}</span>;
}
