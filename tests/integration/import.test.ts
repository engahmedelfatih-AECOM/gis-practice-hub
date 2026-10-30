import { readFileSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { importClientSchema, importHubWorkbook, listImportRuns } from "@/application/hub/import";
import { dashboard, projectPage, projectsView } from "@/application/hub/views";
import { listRows } from "@/application/hub/registers";
import { admin, db, resetDb, schema, viewer } from "./helpers";

beforeEach(resetDb);

const fixture = () => readFileSync(path.join(process.cwd(), "tests/fixtures/GIS_Practice_Hub_sample.xlsx"));

describe("workbook import", () => {
  it("dry run counts rows without writing, then apply loads every sheet idempotently", async () => {
    const a = await admin();
    const dry = await importHubWorkbook(a, { name: "hub.xlsx", buffer: fixture() }, true);
    expect(dry.dryRun).toBe(true);
    expect(dry.registers.find((r) => r.key === "projects")!.rows).toBe(10);
    expect((await db.select().from(schema.project)).length).toBe(0);

    const first = await importHubWorkbook(a, { name: "hub.xlsx", buffer: fixture() }, false);
    const byKey = Object.fromEntries(first.registers.map((r) => [r.key, r]));
    expect(byKey.projects!.inserted).toBe(10);
    expect(byKey.packages!.inserted).toBe(13);
    expect(byKey.schema!.inserted).toBe(400);
    expect(byKey.resources!.inserted).toBe(11);
    expect(byKey.updates!.inserted).toBe(12);
    expect(byKey.risks!.inserted).toBe(7);
    expect(byKey.standards!.inserted).toBe(13);
    expect(first.periods).toBe(80);
    expect(first.workflows).toBeGreaterThan(0);

    const second = await importHubWorkbook(a, { name: "hub.xlsx", buffer: fixture() }, false);
    const again = Object.fromEntries(second.registers.map((r) => [r.key, r]));
    expect(again.projects!.inserted).toBe(0);
    expect(again.projects!.updated).toBe(10);
    expect(again.packages!.inserted).toBe(0);
    expect((await db.select().from(schema.pkg)).length).toBe(13);
    expect((await listImportRuns(a)).length).toBe(3);
  });

  it("derives the Projects register and the project page like the workbook", async () => {
    const a = await admin();
    await importHubWorkbook(a, { name: "hub.xlsx", buffer: fixture() }, false);
    const v = await viewer();
    const { rows } = await projectsView(v);
    const laheq = rows.find((r) => r.name === "Laheq Island")!;
    expect(laheq.region).toBe("Mix EC Resources");
    expect(laheq.delivered).toBe("MP Masterplan - Plots & Parcels (2D) - Approved");
    expect(laheq.inProgress).toContain("IFC Power / Electrical (MV/LV) (2D & 3D)");
    expect(laheq.milestone.date).toBe("2026-10-29");
    expect(laheq.stageStates.MP).toBe("Approved");

    const page = await projectPage(v, laheq.id, undefined);
    expect(page.tracker.summary.total).toBe(6);
    expect(page.tracker.summary.overallProgress).toBe(52);
    expect(page.workflow.length).toBe(12);
    expect(page.workflow[0]!.status).toBe("Completed");

    const periods = page.periods;
    const oct12 = periods.find((p) => p.startDate === "2026-10-12")!;
    const withUpdates = await projectPage(v, laheq.id, oct12.id);
    expect(withUpdates.blocks.Accomplishment.length).toBe(2);
    expect(withUpdates.blocks.Concern[0]!.mitigation).toContain("MoM");

    const d = await dashboard(v, oct12.id);
    expect(d.kpis.totalProjects).toBe(10);
    expect(d.kpis.completed).toBe(1);
    const packages = await listRows(v, "packages", { projectId: laheq.id });
    expect(packages.length).toBe(6);
  });

  it("imports a client Master Tracker workbook", async () => {
    const a = await admin();
    const wb = new ExcelJS.Workbook();
    const m = wb.addWorksheet("Master Tracker");
    m.addRow(["GIS FEATURE CLASS MASTER TRACKER"]);
    m.addRow([]);
    m.addRow(["#", "Grouping Abbr", "Grouping Name", "Feature Class", "Feature Class Alias", "Geometry Type", "Discipline", "Discipline Individual", "Available / Unavailable", "GIS Comments", "Status", "Notes"]);
    m.addRow([1, "BU", "Buildings", "buBuildingS", null, "Polygon", "Masterplan", "A. Person", "Available", "check", "In Progress", null]);
    m.addRow([2, "BU", "Buildings", "buBuildingL", null, "Polyline", "Masterplan", null, "Unavailable", null, null, null]);
    const d = wb.addWorksheet("Dictionary");
    d.addRow(["Grouping", "Feature Class", "Geometry Type", "Field Name", "Field Alias", "Description", "ESRI Field Type", "Text Max Length", "Numeric Precision", "Numeric Scale", "Domain Hint", "Nullable", "Default Value", "Units"]);
    d.addRow(["BU", "buBuildingS", "Polygon", "bldgNo", "Building Number", null, "String", 4, null, null, null, "Yes", null, null]);
    const s = wb.addWorksheet("Subtypes");
    s.addRow(["Feature Class", "Subtype Code", "Subtype Name"]);
    s.addRow(["buBuildingS", 1, "Main"]);
    const dom = wb.addWorksheet("Domains");
    dom.addRow(["Domain Name", "Domain Type", "Domain Values"]);
    dom.addRow(["booleanValue", "CODEDVALUE", "1: True, 2: False"]);
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const summary = await importClientSchema(a, { clientName: "Test Client" }, { name: "t.xlsx", buffer }, false);
    expect(summary).toMatchObject({ featureClasses: 2, fields: 1, subtypes: 1, domains: 1 });
    const [cs] = await db.select().from(schema.clientSchema).where(eq(schema.clientSchema.clientName, "Test Client"));
    expect(cs).toBeTruthy();
    // Re-import replaces, never duplicates.
    await importClientSchema(a, { clientName: "Test Client" }, { name: "t.xlsx", buffer }, false);
    expect((await db.select().from(schema.clientFeatureClass)).length).toBe(2);
  });
});
