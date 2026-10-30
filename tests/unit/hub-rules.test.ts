import { describe, expect, it } from "vitest";
import {
  dashboardKpis,
  daysOverdue,
  deliveredText,
  deliverySummary,
  disciplineGroup,
  inProgressText,
  nextMilestone,
  packageLabel,
  periodBucket,
  periodLabel,
  projectUtilisation,
  qaqcScore,
  resourcesRegion,
  rfiCounts,
  rfiRag,
  stageCode,
  utilisation,
} from "@/domain/hub/rules";

/** The Laheq Island packages of the sample workbook (Packages sheet rows 6 to 11). */
const LAHEQ = [
  { designStage: "MP - Masterplan", discipline: "Masterplan - Plots & Parcels", dimension: "2D", status: "Approved", plannedSubmission: null, actualSubmission: null, progressPct: 100 },
  { designStage: "IFC - Issued for Construction", discipline: "Power / Electrical (MV/LV)", dimension: "2D & 3D", status: "Client Comments", plannedSubmission: "2026-10-29", actualSubmission: "2026-09-10", progressPct: 80 },
  { designStage: "IFC - Issued for Construction", discipline: "Security", dimension: "2D & 3D", status: "In Progress", plannedSubmission: "2026-11-12", actualSubmission: null, progressPct: 40 },
  { designStage: "IFC - Issued for Construction", discipline: "Telecom / ICT", dimension: "2D & 3D", status: "In Progress", plannedSubmission: "2026-11-12", actualSubmission: null, progressPct: 40 },
  { designStage: "IFC - Issued for Construction", discipline: "Irrigation / TSE", dimension: "2D & 3D", status: "In Progress", plannedSubmission: "2026-11-19", actualSubmission: null, progressPct: 30 },
  { designStage: "IFC - Issued for Construction", discipline: "Sewer / Wastewater", dimension: "2D & 3D", status: "In Progress", plannedSubmission: "2026-11-26", actualSubmission: null, progressPct: 20 },
];

describe("stage and package labels", () => {
  it("takes the code before the dash and keeps typed variants", () => {
    expect(stageCode("DD - Detailed Design")).toBe("DD");
    expect(stageCode("CD 50% - Concept Design 50%")).toBe("CD 50%");
    expect(stageCode("IFC")).toBe("IFC");
  });
  it("prints the workbook label", () => {
    expect(packageLabel(LAHEQ[1]!)).toBe("IFC Power / Electrical (MV/LV) (2D & 3D)");
  });
  it("lists delivered and in-progress packages as the Projects register does", () => {
    expect(deliveredText(LAHEQ)).toBe("MP Masterplan - Plots & Parcels (2D) - Approved");
    expect(inProgressText(LAHEQ)).toBe(
      "IFC Power / Electrical (MV/LV) (2D & 3D); IFC Security (2D & 3D); IFC Telecom / ICT (2D & 3D); IFC Irrigation / TSE (2D & 3D); IFC Sewer / Wastewater (2D & 3D)",
    );
  });
});

describe("discipline group", () => {
  const groups = new Map([
    ["Roads & Highways", "Infrastructure"],
    ["Masterplan - Land Use", "Masterplan"],
  ]);
  it("resolves one discipline, the first of several, and Multiple when unknown", () => {
    expect(disciplineGroup("Roads & Highways", groups)).toBe("Infrastructure");
    expect(disciplineGroup("Roads & Highways, Telecom / ICT", groups)).toBe("Infrastructure");
    expect(disciplineGroup("Unknown, Roads & Highways", groups)).toBe("Multiple");
    expect(disciplineGroup("", groups)).toBeNull();
  });
});

describe("dates and milestones", () => {
  it("counts days overdue like the Delivery Tracker", () => {
    expect(daysOverdue("2026-11-12", null, "2026-10-30")).toBe(0);
    expect(daysOverdue("2026-10-20", null, "2026-10-30")).toBe(10);
    expect(daysOverdue("2026-10-29", "2026-09-10", "2026-10-30")).toBe(0);
    expect(daysOverdue("2026-10-01", "2026-10-05", "2026-10-30")).toBe(4);
    expect(daysOverdue(null, null, "2026-10-30")).toBeNull();
  });
  it("picks the earliest open planned submission, or the override", () => {
    expect(nextMilestone(LAHEQ, null)).toEqual({
      text: "IFC Power / Electrical (MV/LV) (2D & 3D) - 29-Oct-26",
      date: "2026-10-29",
    });
    expect(nextMilestone(LAHEQ, "Handover 15-Dec-2026")).toEqual({ text: "Handover 15-Dec-2026", date: null });
    expect(nextMilestone([LAHEQ[0]!], null)).toEqual({ text: "-", date: null });
  });
  it("labels and buckets periods", () => {
    expect(periodLabel("2026-10-12", null)).toBe("12-Oct-2026 to 25-Oct-2026");
    expect(periodLabel("2026-09-29", "2026-10-12")).toBe("29-Sep-2026 to 12-Oct-2026");
    const periods = [
      { startDate: "2026-09-28", endDate: "2026-10-11" },
      { startDate: "2026-10-12", endDate: "2026-10-25" },
    ];
    expect(periodBucket("2026-09-29", periods)).toBe(periods[0]);
    expect(periodBucket("2026-10-25", periods)).toBe(periods[1]);
    expect(periodBucket("2026-11-01", periods)).toBeNull();
  });
});

describe("RFIs, QA/QC, resources", () => {
  const today = "2026-10-30";
  it("flags overdue open RFIs and counts them", () => {
    const rfis = [
      { status: "Open", dueDate: "2026-10-20" },
      { status: "Open", dueDate: "2026-11-20" },
      { status: "Answered", dueDate: "2026-10-01" },
      { status: "Closed", dueDate: "2026-10-01" },
    ];
    expect(rfiCounts(rfis, today)).toEqual({ open: 2, closed: 1, total: 4, overdue: 1 });
    expect(rfiRag(rfis[0]!, today)).toBe("Red");
    expect(rfiRag(rfis[1]!, today)).toBe("Amber");
    expect(rfiRag(rfis[3]!, today)).toBe("Green");
  });
  it("scores a checklist", () => {
    expect(qaqcScore({ crs: "Pass", schema: "Pass", topology: "N/A", attributes: "Fail" })).toMatchObject({
      passes: 2,
      fails: 1,
      score: 67,
      result: "Fail",
    });
    expect(qaqcScore({ crs: "Pass", schema: "Pass" }).result).toBe("Pass");
    expect(qaqcScore({}).result).toBe("Pending");
  });
  it("derives utilisation and the resources region", () => {
    expect(utilisation(80, 60)).toBe(75);
    expect(utilisation(0, 10)).toBeNull();
    expect(projectUtilisation([{ plannedHours: 80, actualHours: 60 }, { plannedHours: 40, actualHours: 40 }])).toBe(88);
    expect(resourcesRegion(["Dubai", "India", "South Africa"])).toBe("Mix EC Resources");
    expect(resourcesRegion(["Dubai", "India"])).toBe("India");
    expect(resourcesRegion(["Dubai"])).toBe("Dubai");
    expect(resourcesRegion([])).toBe("-");
  });
});

describe("delivery summary and dashboard", () => {
  it("summarises the Laheq tracker as the workbook does (6 packages, 1 approved, 52 %)", () => {
    expect(deliverySummary(LAHEQ)).toEqual({
      total: 6,
      approved: 1,
      submitted: 0,
      inProgress: 5,
      notStarted: 0,
      overallProgress: 52,
    });
  });
  it("computes the dashboard tiles", () => {
    const k = dashboardKpis({
      projects: [
        { status: "Progressing", crsOpen: 2 },
        { status: "At Risk" },
        { status: "Completed" },
        { status: "Not Started" },
      ],
      packages: LAHEQ,
      rfis: [{ status: "Open", dueDate: "2026-10-01" }],
      risks: [{ status: "Open" }, { status: "Closed" }],
      resources: [{ plannedHours: 10, actualHours: 6 }],
      period: { startDate: "2026-09-07", endDate: "2026-09-20" },
      today: "2026-10-30",
    });
    expect(k).toMatchObject({
      totalProjects: 4,
      activeProjects: 3,
      atRisk: 1,
      notStarted: 1,
      submissionsThisPeriod: 1,
      openClientComments: 2,
      openRfis: 1,
      overdueRfis: 1,
      teamUtilisation: 60,
      openRisks: 1,
    });
  });
});
