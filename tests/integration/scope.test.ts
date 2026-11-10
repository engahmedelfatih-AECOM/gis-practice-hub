import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getRow, listRows, countRows, updateRow } from "@/application/hub/registers";
import { dashboard, projectsView } from "@/application/hub/views";
import { exportRegister } from "@/application/hub/exports";
import { admin, db, makeActor, resetDb, schema, seedLists } from "./helpers";
import type { Actor } from "@/application/auth/actor";

/**
 * REGION scope (report 2026-11-02, B2). A grant with REGION scope names one hub of the Hub /
 * Region list, and a project belongs to the hubs of the people allocated to it, as the workbook's
 * "GIS Resources Region" column does.
 *
 * The rows are inserted straight into the database here, and the whole file shares one data set:
 * the region lookup is memoised with React's `cache()`, which is per request in the application
 * but per module in a test run, so data created between two service calls would not be seen.
 */
let indiaLead: Actor;
let globalLead: Actor;
let a: Actor;
const ids: Record<string, string> = {};

beforeAll(async () => {
  await resetDb();
  await seedLists();
  a = await admin();
  for (const [name, hub] of [
    ["India project", "India"],
    ["Dubai project", "Dubai"],
    ["Mixed project", "Mix EC Resources"],
  ] as const) {
    const [p] = await db.insert(schema.project).values({ name, status: "Progressing", sortOrder: 1 }).returning();
    ids[name] = p!.id;
    await db.insert(schema.resourceRow).values({ projectId: p!.id, name: `Person ${name}`, hub, sortOrder: 1 });
    await db.insert(schema.pkg).values({
      projectId: p!.id,
      designStage: "DD - Detailed Design",
      discipline: "Roads & Highways",
      description: "Road network",
      status: "In Progress",
      plannedSubmission: "2026-12-01",
      progressPct: 20,
      sortOrder: 1,
    });
  }
  // A practice-wide row: it belongs to no project and stays visible to everyone.
  await db.insert(schema.standardItem).values({ title: "GIS-STD-001", sortOrder: 1 });

  const regions = await db.select().from(schema.listItem).where(eq(schema.listItem.listKey, "region"));
  const indiaId = regions.find((r) => r.value === "India")!.id;
  indiaLead = await makeActor([{ role: "GIS_LEAD", scopeType: "REGION", scopeId: indiaId }]);
  globalLead = await makeActor([{ role: "GIS_LEAD" }]);
});

describe("REGION scope", () => {
  it("lists only the projects of the hub", async () => {
    const names = (await listRows(indiaLead, "projects", {})).map((r) => r.name);
    expect(names).toEqual(["India project"]);
    expect(await countRows(indiaLead, "projects", {})).toBe(1);
    expect((await listRows(globalLead, "projects", {})).length).toBe(3);
  });

  it("refuses a single project of another hub, and allows its own", async () => {
    await expect(getRow(indiaLead, "projects", ids["Dubai project"]!)).rejects.toThrow(/India/);
    expect((await getRow(indiaLead, "projects", ids["India project"]!)).name).toBe("India project");
  });

  it("refuses a package of another hub, on the read and on the write", async () => {
    const [outside] = await listRows(a, "packages", { projectId: ids["Dubai project"]! });
    await expect(getRow(indiaLead, "packages", outside!.id)).rejects.toThrow();
    await expect(
      updateRow(indiaLead, "packages", {
        __register: "packages",
        id: outside!.id,
        version: outside!.version,
        projectId: ids["Dubai project"]!,
        designStage: "DD - Detailed Design",
        discipline: "Roads & Highways",
        status: "Submitted",
      }),
    ).rejects.toThrow();
  });

  it("lets the lead change a package of their own hub", async () => {
    const [own] = await listRows(indiaLead, "packages", { projectId: ids["India project"]! });
    await updateRow(indiaLead, "packages", {
      __register: "packages",
      id: own!.id,
      version: own!.version,
      projectId: ids["India project"]!,
      designStage: "DD - Detailed Design",
      discipline: "Roads & Highways",
      description: "Road network",
      status: "Submitted",
      plannedSubmission: "2026-12-01",
    });
    expect((await getRow(a, "packages", own!.id)).status).toBe("Submitted");
  });

  it("keeps the views and the exports inside the scope", async () => {
    const { rows } = await projectsView(indiaLead);
    expect(rows.map((r) => r.name)).toEqual(["India project"]);
    const dash = await dashboard(indiaLead);
    expect(dash.kpis.totalProjects).toBe(1);
    expect((await dashboard(globalLead)).kpis.totalProjects).toBe(3);
    const file = await exportRegister(indiaLead, "projects");
    expect(file.fileName).toMatch(/\.xlsx$/);
    expect(file.buffer.length).toBeGreaterThan(0);
  });

  it("keeps a practice-wide register visible to everyone", async () => {
    expect((await listRows(indiaLead, "standards", {})).length).toBe(1);
    expect((await listRows(globalLead, "standards", {})).length).toBe(1);
  });
});
