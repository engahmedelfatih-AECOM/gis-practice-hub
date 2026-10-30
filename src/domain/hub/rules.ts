/**
 * Pure derivations of the GIS Practice Hub workbook. Every formula of the sheets that the
 * application replaces lives here, with the same inputs and the same results, so the screens
 * and the exports agree with the Excel file the team knows. No I/O.
 */

export type IsoDate = string; // YYYY-MM-DD

/** Package statuses that count as delivered (workbook: Submitted / Resubmitted / Approved). */
export const DELIVERED_STATUSES = new Set(["Submitted", "Resubmitted", "Approved"]);
/** Package statuses that count as in progress (everything active that is not delivered). */
export const IN_PROGRESS_STATUSES = new Set([
  "Not Started",
  "In Progress",
  "Internal QA/QC",
  "Client Comments",
  "On Hold",
]);
export const EC_HUBS = new Set(["India", "Romania", "South Africa"]);

export interface PackageLike {
  designStage: string;
  discipline: string;
  dimension?: string | null;
  status: string;
  plannedSubmission?: IsoDate | null;
  actualSubmission?: IsoDate | null;
  approvalDate?: IsoDate | null;
  progressPct?: number | null;
  clientReviewStatus?: string | null;
}

/** "DD - Detailed Design" -> "DD"; "CD 50% - Concept Design 50%" -> "CD 50%". */
export function stageCode(designStage: string | null | undefined): string {
  if (!designStage) return "";
  const i = designStage.indexOf(" -");
  return i > 0 ? designStage.slice(0, i).trim() : designStage.trim();
}

/** The package label of the workbook: "IFC Power / Electrical (MV/LV) (2D & 3D)". */
export function packageLabel(p: PackageLike): string {
  const dim = p.dimension ? ` (${p.dimension})` : "";
  return `${stageCode(p.designStage)} ${p.discipline}${dim}`.trim();
}

/** Projects column "GIS Delivered / Approved": delivered packages with their status. */
export function deliveredText(packages: PackageLike[]): string {
  return packages
    .filter((p) => DELIVERED_STATUSES.has(p.status))
    .map((p) => `${packageLabel(p)} - ${p.status}`)
    .join("; ");
}

/** Projects column "GIS In Progress": active packages that are not delivered. */
export function inProgressText(packages: PackageLike[]): string {
  return packages
    .filter((p) => IN_PROGRESS_STATUSES.has(p.status))
    .map((p) => packageLabel(p))
    .join("; ");
}

/**
 * Discipline Group of a package: the group of the discipline, the group of the first discipline
 * when several are typed with commas, or "Multiple" when the first one is unknown.
 */
export function disciplineGroup(
  discipline: string | null | undefined,
  groups: ReadonlyMap<string, string>,
): string | null {
  if (!discipline) return null;
  const direct = groups.get(discipline.trim());
  if (direct) return direct;
  const first = discipline.split(",")[0]!.trim();
  const g = groups.get(first);
  return g ?? "Multiple";
}

/** Whole days between two ISO dates (b - a). */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  const ms = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  return Math.round(ms / 86_400_000);
}

export function addDays(d: IsoDate, n: number): IsoDate {
  const t = Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) + n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Delivery Tracker "Days Overdue": without an actual submission, days past the planned date
 * (0 when not yet due); with one, days the actual was later than the planned.
 */
export function daysOverdue(
  planned: IsoDate | null | undefined,
  actual: IsoDate | null | undefined,
  today: IsoDate,
): number | null {
  if (!planned) return null;
  if (!actual) return today > planned ? daysBetween(planned, today) : 0;
  return actual > planned ? daysBetween(planned, actual) : 0;
}

export interface Milestone {
  text: string;
  date: IsoDate | null;
}

/**
 * Next Milestone of a project: the override when typed, otherwise the earliest planned
 * submission among packages still to be approved, as "label - dd-MMM-yy".
 */
export function nextMilestone(packages: PackageLike[], override: string | null | undefined): Milestone {
  if (override && override.trim()) return { text: override.trim(), date: null };
  const open = packages.filter(
    (p) => p.plannedSubmission && p.status !== "Approved" && p.status !== "Cancelled",
  );
  if (!open.length) return { text: "-", date: null };
  const next = open.reduce((a, b) => (b.plannedSubmission! < a.plannedSubmission! ? b : a));
  return {
    text: `${packageLabel(next)} - ${formatShort(next.plannedSubmission!)}`,
    date: next.plannedSubmission!,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** dd-MMM-yy as the workbook prints milestones. */
export function formatShort(d: IsoDate): string {
  return `${d.slice(8, 10)}-${MONTHS[+d.slice(5, 7) - 1]}-${d.slice(2, 4)}`;
}
/** dd-MMM-yyyy as every date cell of the workbook. */
export function formatLong(d: IsoDate): string {
  return `${d.slice(8, 10)}-${MONTHS[+d.slice(5, 7) - 1]}-${d.slice(0, 4)}`;
}

/** Submissions This Period: packages actually submitted inside the period. */
export function submissionsInPeriod(packages: PackageLike[], start: IsoDate, end: IsoDate): number {
  return packages.filter((p) => p.actualSubmission && p.actualSubmission >= start && p.actualSubmission <= end).length;
}

export interface RfiLike {
  status: string;
  dueDate?: IsoDate | null;
}

export function rfiOverdue(r: RfiLike, today: IsoDate): boolean {
  return r.status === "Open" && Boolean(r.dueDate) && r.dueDate! < today;
}

/** RFI RAG: Closed is Green, overdue is Red, everything else still open is Amber. */
export function rfiRag(r: RfiLike, today: IsoDate): "Green" | "Amber" | "Red" {
  if (r.status === "Closed") return "Green";
  if (rfiOverdue(r, today)) return "Red";
  return "Amber";
}

export interface RfiCounts {
  open: number;
  closed: number;
  total: number;
  overdue: number;
}

export function rfiCounts(rfis: RfiLike[], today: IsoDate): RfiCounts {
  return {
    open: rfis.filter((r) => r.status === "Open").length,
    closed: rfis.filter((r) => r.status === "Closed").length,
    total: rfis.length,
    overdue: rfis.filter((r) => rfiOverdue(r, today)).length,
  };
}

export interface QaqcScore {
  passes: number;
  fails: number;
  applicable: number;
  /** Percentage of applicable checks that passed; null when nothing was checked. */
  score: number | null;
  result: "Pass" | "Fail" | "Pending";
}

/** QAQC Score and Result: Fail if any check failed, Pass when every applicable check passed. */
export function qaqcScore(checks: Record<string, string | null | undefined>): QaqcScore {
  const values = Object.values(checks).map((v) => (v ?? "").trim());
  const passes = values.filter((v) => v === "Pass").length;
  const fails = values.filter((v) => v === "Fail").length;
  const applicable = passes + fails;
  const score = applicable ? Math.round((passes / applicable) * 100) : null;
  const result = fails > 0 ? "Fail" : passes > 0 ? "Pass" : "Pending";
  return { passes, fails, applicable, score, result };
}

/** Resources Utilisation %: actual over planned hours (null when no plan). */
export function utilisation(planned: number | null | undefined, actual: number | null | undefined): number | null {
  if (!planned || planned <= 0) return null;
  return Math.round(((actual ?? 0) / planned) * 100);
}

/**
 * GIS Resources Region of a project from the hubs of its resources: more than one EC hub
 * (India, Romania, South Africa) is "Mix EC Resources", one EC hub is that hub, Dubai alone
 * is "Dubai", nobody is "-".
 */
export function resourcesRegion(hubs: (string | null | undefined)[]): string {
  const set = new Set(hubs.filter((h): h is string => Boolean(h)).map((h) => h.trim()));
  const ec = [...set].filter((h) => EC_HUBS.has(h));
  if (ec.length > 1) return "Mix EC Resources";
  if (ec.length === 1) return ec[0]!;
  if (set.has("Dubai")) return "Dubai";
  if (set.has("Mix EC Resources")) return "Mix EC Resources";
  return "-";
}

/** Average utilisation of the people on a project (null when none has a plan). */
export function projectUtilisation(rows: { plannedHours?: number | null; actualHours?: number | null }[]): number | null {
  const u = rows.map((r) => utilisation(r.plannedHours, r.actualHours)).filter((v): v is number => v !== null);
  return u.length ? Math.round(u.reduce((a, b) => a + b, 0) / u.length) : null;
}

export interface PeriodLike {
  startDate: IsoDate;
  endDate: IsoDate;
}

/** Report Period label of the Updates sheet: "12-Oct-2026 to 25-Oct-2026"; To defaults to From + 13. */
export function periodLabel(from: IsoDate, to: IsoDate | null | undefined, periodDays = 14): string {
  return `${formatLong(from)} to ${formatLong(to ?? addDays(from, periodDays - 1))}`;
}

/** The standard period that contains a date (the "bucket" that places an update on a report). */
export function periodBucket<T extends PeriodLike>(date: IsoDate, periods: T[]): T | null {
  return periods.find((p) => p.startDate <= date && date <= p.endDate) ?? null;
}

export interface DeliverySummary {
  total: number;
  approved: number;
  submitted: number;
  inProgress: number;
  notStarted: number;
  overallProgress: number;
}

/** Delivery Tracker summary row (counts and overall progress of the project's packages). */
export function deliverySummary(packages: PackageLike[]): DeliverySummary {
  const total = packages.length;
  const approved = packages.filter(
    (p) => p.status === "Approved" || p.clientReviewStatus === "Approved" || p.clientReviewStatus === "Approved in Principle",
  ).length;
  const submitted = packages.filter((p) => p.status === "Submitted" || p.status === "Resubmitted").length;
  const inProgress = packages.filter((p) => ["In Progress", "Internal QA/QC", "Client Comments", "On Hold"].includes(p.status)).length;
  const notStarted = packages.filter((p) => p.status === "Not Started").length;
  const progress = packages.map((p) => p.progressPct ?? 0);
  const overallProgress = total ? Math.round(progress.reduce((a, b) => a + b, 0) / total) : 0;
  return { total, approved, submitted, inProgress, notStarted, overallProgress };
}

export interface ProjectLike {
  status: string;
}

export interface DashboardKpis {
  totalProjects: number;
  activeProjects: number;
  notStarted: number;
  atRisk: number;
  onHold: number;
  completed: number;
  submissionsThisPeriod: number;
  openClientComments: number;
  openRfis: number;
  overdueRfis: number;
  teamUtilisation: number | null;
  openRisks: number;
}

/** Dashboard tiles for the selected period. Active = every project not Completed or On Hold. */
export function dashboardKpis(input: {
  projects: (ProjectLike & { crsOpen?: number })[];
  packages: PackageLike[];
  rfis: RfiLike[];
  risks: { status: string }[];
  resources: { plannedHours?: number | null; actualHours?: number | null }[];
  period: PeriodLike;
  today: IsoDate;
}): DashboardKpis {
  const byStatus = (s: string) => input.projects.filter((p) => p.status === s).length;
  const rfi = rfiCounts(input.rfis, input.today);
  return {
    totalProjects: input.projects.length,
    activeProjects: input.projects.filter((p) => p.status !== "Completed" && p.status !== "On Hold").length,
    notStarted: byStatus("Not Started"),
    atRisk: byStatus("At Risk"),
    onHold: byStatus("On Hold"),
    completed: byStatus("Completed"),
    submissionsThisPeriod: submissionsInPeriod(input.packages, input.period.startDate, input.period.endDate),
    openClientComments: input.projects.reduce((s, p) => s + (p.crsOpen ?? 0), 0),
    openRfis: rfi.open,
    overdueRfis: rfi.overdue,
    teamUtilisation: projectUtilisation(input.resources),
    openRisks: input.risks.filter((r) => r.status === "Open").length,
  };
}

/** Today in ISO form (UTC). Kept here so the whole domain has one definition. */
export function todayIso(now = new Date()): IsoDate {
  return now.toISOString().slice(0, 10);
}
