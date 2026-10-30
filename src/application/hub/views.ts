import "server-only";
import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import {
  DESIGN_STAGE_CODES,
  UPDATE_TYPES,
  type DesignStageCode,
  type UpdateType,
} from "@/domain/shared/enums";
import {
  dashboardKpis,
  daysOverdue,
  deliveredText,
  deliverySummary,
  disciplineGroup,
  inProgressText,
  nextMilestone,
  periodBucket,
  periodLabel,
  projectUtilisation,
  qaqcScore,
  resourcesRegion,
  rfiCounts,
  rfiRag,
  submissionsInPeriod,
  todayIso,
  type DashboardKpis,
  type DeliverySummary,
  type Milestone,
  type RfiCounts,
} from "@/domain/hub/rules";
import { db } from "@/infrastructure/db/client";
import {
  enterpriseApp,
  pkg,
  project,
  qaqcChecklist,
  resourceRow,
  rfi,
  risk,
  updateItem,
  workflowStep,
} from "@/infrastructure/db/schema";
import type { Actor } from "@/application/auth/actor";
import { notFound } from "@/application/errors";
import { assertCan } from "@/application/shared/guard";
import { getSetting } from "@/application/settings/settings";
import { disciplineGroups } from "./lists";
import { listPeriods, resolvePeriod, type PeriodView } from "./periods";

export type ProjectRow = typeof project.$inferSelect;
export type PackageRow = typeof pkg.$inferSelect;
export type RfiRow = typeof rfi.$inferSelect;
export type RiskRow = typeof risk.$inferSelect;
export type ResourceRowT = typeof resourceRow.$inferSelect;
export type UpdateRow = typeof updateItem.$inferSelect;
export type QaqcRow = typeof qaqcChecklist.$inferSelect;

/** Every register in one read: the registers are small (hundreds of rows), the derivations cross them. */
const loadAll = cache(async () => {
  const [projects, packages, rfis, risks, resources, updates, qaqc] = await Promise.all([
    db.select().from(project).orderBy(asc(project.sortOrder), asc(project.name)),
    db.select().from(pkg).orderBy(asc(pkg.sortOrder), asc(pkg.createdAt)),
    db.select().from(rfi).orderBy(asc(rfi.sortOrder)),
    db.select().from(risk).orderBy(asc(risk.sortOrder)),
    db.select().from(resourceRow).orderBy(asc(resourceRow.sortOrder)),
    db.select().from(updateItem).orderBy(asc(updateItem.sortOrder), asc(updateItem.createdAt)),
    db.select().from(qaqcChecklist).orderBy(asc(qaqcChecklist.sortOrder)),
  ]);
  return { projects, packages, rfis, risks, resources, updates, qaqc };
});

const num = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? null : Number(v));

export interface ProjectView extends ProjectRow {
  region: string;
  delivered: string;
  inProgress: string;
  milestone: Milestone;
  utilisation: number | null;
  rfi: RfiCounts;
  submissionsThisPeriod: number;
  crsTotal: number;
  stageStates: Record<string, string>;
}

function deriveProject(
  p: ProjectRow,
  data: Awaited<ReturnType<typeof loadAll>>,
  period: PeriodView | null,
  today: string,
): ProjectView {
  const packages = data.packages.filter((x) => x.projectId === p.id);
  const resources = data.resources.filter((x) => x.projectId === p.id);
  const rfis = data.rfis.filter((x) => x.projectId === p.id);
  return {
    ...p,
    region: resourcesRegion(resources.map((r) => r.hub)),
    delivered: deliveredText(packages),
    inProgress: inProgressText(packages),
    milestone: nextMilestone(packages, p.milestoneOverride),
    utilisation: projectUtilisation(resources.map((r) => ({ plannedHours: num(r.plannedHours), actualHours: num(r.actualHours) }))),
    rfi: rfiCounts(rfis, today),
    submissionsThisPeriod: period ? submissionsInPeriod(packages, period.startDate, period.endDate) : 0,
    crsTotal: p.crsOpen + p.crsInReview + p.crsClosed,
    stageStates: p.stageStates ?? {},
  };
}

/** Projects register with every calculated column of the sheet. */
export async function projectsView(actor: Actor, periodId?: string | null): Promise<{ rows: ProjectView[]; period: PeriodView | null; periods: PeriodView[] }> {
  assertCan(actor, "hub:read");
  const [data, periods, period] = await Promise.all([loadAll(), listPeriods(), resolvePeriod(periodId)]);
  const today = todayIso();
  return { rows: data.projects.map((p) => deriveProject(p, data, period, today)), period, periods };
}

export interface Dashboard {
  period: PeriodView | null;
  periods: PeriodView[];
  kpis: DashboardKpis;
  statusCounts: { status: string; count: number }[];
  projects: ProjectView[];
  map: { id: string; name: string; status: string; client: string | null; lat: number; lng: number; label: string | null }[];
  mapSettings: { lat: number; lng: number; zoom: number; styleUrl: string };
  today: string;
}

const STATUS_ORDER = ["Not Started", "Progressing", "At Risk", "On Hold", "Completed"];

export async function dashboard(actor: Actor, periodId?: string | null): Promise<Dashboard> {
  assertCan(actor, "hub:read");
  const [data, periods, period, center, styleUrl] = await Promise.all([loadAll(), listPeriods(), resolvePeriod(periodId), getSetting("map.center"), getSetting("map.styleUrl")]);
  const today = todayIso();
  const projects = data.projects.map((p) => deriveProject(p, data, period, today));
  const kpis = dashboardKpis({
    projects: data.projects,
    packages: data.packages,
    rfis: data.rfis,
    risks: data.risks,
    resources: data.resources.map((r) => ({ plannedHours: num(r.plannedHours), actualHours: num(r.actualHours) })),
    period: period ?? { startDate: today, endDate: today },
    today,
  });
  const statusCounts = STATUS_ORDER.map((status) => ({ status, count: data.projects.filter((p) => p.status === status).length }));
  const map = projects
    .filter((p) => p.latitude && p.longitude)
    .map((p) => ({ id: p.id, name: p.name, status: p.status, client: p.client, lat: Number(p.latitude), lng: Number(p.longitude), label: p.locationLabel }));
  return { period, periods, kpis, statusCounts, projects, map, mapSettings: { ...center, styleUrl }, today };
}

export interface UpdateBlockItem {
  id: string;
  description: string;
  mitigation: string | null;
  owner: string | null;
  dueDate: string | null;
  rag: string | null;
}

export interface ProjectPage {
  project: ProjectView;
  period: PeriodView | null;
  periods: PeriodView[];
  packages: (PackageRow & { group: string | null; overdue: number | null })[];
  delivered: PackageRow[];
  inProgress: PackageRow[];
  resources: ResourceRowT[];
  blocks: Record<UpdateType, UpdateBlockItem[]>;
  qaqc: { checklists: number; pass: number; fail: number };
  rfis: RfiRow[];
  risks: RiskRow[];
  stageChips: { code: DesignStageCode; state: string }[];
  apps: (typeof enterpriseApp.$inferSelect)[];
  workflow: (typeof workflowStep.$inferSelect)[];
  itemsPerBlock: number;
  tracker: { rows: DeliveryTrackerRow[]; summary: DeliverySummary };
  today: string;
}

export interface DeliveryTrackerRow {
  n: number;
  id: string;
  disciplineStage: string;
  designApprovalDate: string | null;
  gisStartDate: string | null;
  plannedSubmission: string | null;
  actualSubmission: string | null;
  assignedTo: string | null;
  qaqcResult: string | null;
  status: string;
  clientReviewStatus: string | null;
  clientCommentRef: string | null;
  revisionNo: string | null;
  resubmissionDate: string | null;
  approvalDate: string | null;
  daysOverdue: number | null;
  progressPct: number;
  remarks: string | null;
}

function trackerRows(packages: PackageRow[], today: string): DeliveryTrackerRow[] {
  return packages.map((p, i) => ({
    n: i + 1,
    id: p.id,
    disciplineStage: `${p.discipline} (${p.designStage.split(" -")[0]!.trim()})`,
    designApprovalDate: p.designApprovalDate,
    gisStartDate: p.gisStartDate,
    plannedSubmission: p.plannedSubmission,
    actualSubmission: p.actualSubmission,
    assignedTo: p.assignedTo,
    qaqcResult: p.qaqcResult,
    status: p.status,
    clientReviewStatus: p.clientReviewStatus,
    clientCommentRef: p.clientCommentRef,
    revisionNo: p.revisionNo,
    resubmissionDate: p.resubmissionDate,
    approvalDate: p.approvalDate,
    daysOverdue: daysOverdue(p.plannedSubmission, p.actualSubmission, today),
    progressPct: p.progressPct,
    remarks: p.remarks,
  }));
}

/** Everything the project update page shows for one project and period. */
export async function projectPage(actor: Actor, projectId: string, periodId?: string | null): Promise<ProjectPage> {
  assertCan(actor, "hub:read");
  const [data, periods, period, groups, itemsPerBlock, apps, workflow] = await Promise.all([
    loadAll(),
    listPeriods(),
    resolvePeriod(periodId),
    disciplineGroups(),
    getSetting("report.itemsPerBlock"),
    db.select().from(enterpriseApp).where(eq(enterpriseApp.projectId, projectId)).orderBy(asc(enterpriseApp.sortOrder)),
    db.select().from(workflowStep).where(eq(workflowStep.projectId, projectId)).orderBy(asc(workflowStep.stepNo)),
  ]);
  const today = todayIso();
  const p = data.projects.find((x) => x.id === projectId);
  if (!p) throw notFound("Project");
  const view = deriveProject(p, data, period, today);
  const packages = data.packages.filter((x) => x.projectId === projectId);
  const updates = data.updates.filter((u) => u.projectId === projectId && period && periodBucket(u.periodFrom, periods)?.id === period.id);
  const blocks = Object.fromEntries(
    UPDATE_TYPES.map((t) => [
      t,
      updates
        .filter((u) => u.type === t)
        .slice(0, itemsPerBlock)
        .map((u) => ({ id: u.id, description: u.description, mitigation: u.mitigation, owner: u.owner, dueDate: u.dueDate, rag: u.rag })),
    ]),
  ) as Record<UpdateType, UpdateBlockItem[]>;
  const checklists = data.qaqc.filter((q) => q.projectId === projectId);
  const scored = checklists.map((q) => qaqcScore(q.checks));
  return {
    project: view,
    period,
    periods,
    packages: packages.map((x) => ({ ...x, group: disciplineGroup(x.discipline, groups), overdue: daysOverdue(x.plannedSubmission, x.actualSubmission, today) })),
    delivered: packages.filter((x) => ["Submitted", "Resubmitted", "Approved"].includes(x.status)),
    inProgress: packages.filter((x) => ["Not Started", "In Progress", "Internal QA/QC", "Client Comments", "On Hold"].includes(x.status)),
    resources: data.resources.filter((r) => r.projectId === projectId),
    blocks,
    qaqc: { checklists: checklists.length, pass: scored.filter((s) => s.result === "Pass").length, fail: scored.filter((s) => s.result === "Fail").length },
    rfis: data.rfis.filter((r) => r.projectId === projectId),
    risks: data.risks.filter((r) => r.projectId === projectId && r.status !== "Closed"),
    stageChips: DESIGN_STAGE_CODES.map((code) => ({ code, state: p.stageStates?.[code] ?? "" })),
    apps,
    workflow,
    itemsPerBlock,
    tracker: { rows: trackerRows(packages, today), summary: deliverySummary(packages) },
    today,
  };
}

/** Delivery Tracker of one project (the one-page view of its Packages rows). */
export async function deliveryTracker(actor: Actor, projectId: string) {
  assertCan(actor, "hub:read");
  const data = await loadAll();
  const p = data.projects.find((x) => x.id === projectId);
  if (!p) throw notFound("Project");
  const today = todayIso();
  const packages = data.packages.filter((x) => x.projectId === projectId);
  const resources = data.resources.filter((x) => x.projectId === projectId);
  return {
    project: p,
    gisLead: p.gisLead ?? resources.find((r) => r.role === "GIS Lead")?.name ?? null,
    rows: trackerRows(packages, today),
    summary: deliverySummary(packages),
    today,
    projects: data.projects.map((x) => ({ id: x.id, name: x.name })),
  };
}

/** Extra columns of the registers that the workbook calculates (shown read-only in the tables). */
export async function registerExtras(key: "packages" | "rfis" | "qaqc" | "resources" | "updates") {
  const today = todayIso();
  if (key === "packages") {
    const groups = await disciplineGroups();
    return (row: Record<string, unknown>) => ({
      "Discipline Group": disciplineGroup(row.discipline as string, groups) ?? "",
      "Days Overdue": daysOverdue(row.plannedSubmission as string | null, row.actualSubmission as string | null, today) ?? "",
    });
  }
  if (key === "rfis") {
    return (row: Record<string, unknown>) => {
      const r = { status: row.status as string, dueDate: row.dueDate as string | null };
      return { Overdue: rfiRag(r, today) === "Red" ? "Yes" : "No", RAG: rfiRag(r, today) };
    };
  }
  if (key === "qaqc") {
    return (row: Record<string, unknown>) => {
      const s = qaqcScore(Object.fromEntries(["crs", "schema", "topology", "attributes", "naming", "metadata", "format", "internalReview"].map((k) => [k, row[k] as string])));
      return { Score: s.score === null ? "" : `${s.score} %`, Result: s.result };
    };
  }
  if (key === "resources") {
    return (row: Record<string, unknown>) => {
      const u = projectUtilisation([{ plannedHours: num(row.plannedHours as string), actualHours: num(row.actualHours as string) }]);
      return { "Utilisation %": u === null ? "" : `${u} %` };
    };
  }
  const periods = await listPeriods();
  return (row: Record<string, unknown>) => ({
    "Report Period": periodLabel(row.periodFrom as string, row.periodTo as string | null),
    "Standard period": periodBucket(row.periodFrom as string, periods)?.label ?? "outside the calendar",
  });
}

export { periodLabel };
