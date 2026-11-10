import { beforeEach, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { historyFor, listAudit } from "@/application/audit/read";
import { systemActor } from "@/application/auth/system-actor";
import { deleteClientSchema, getClientSchema, listClientSchemas, updateClientSchema, updateFeatureClass } from "@/application/hub/client-schemas";
import { feedProjects, feedRegister } from "@/application/hub/feed";
import { addEnterpriseApp, addWorkflowStep, listProjectsBrief, removeEnterpriseApp, removeWorkflowStep, resetWorkflow, updateWorkflowStep } from "@/application/hub/project-extras";
import { createRow } from "@/application/hub/registers";
import { regeneratePeriods } from "@/application/hub/periods";
import { authenticateApiKey, createApiKey, hashKey, listApiKeys, revokeApiKey } from "@/application/integration/api-keys";
import { checkDatabaseHealth } from "@/application/system/health";
import { getOverview } from "@/application/system/overview";
import { DEFAULT_WORKFLOW_STEPS } from "@/domain/hub/seed-lists";
import { admin, db, lead, manager, resetDb, schema, seedLists, specialist, viewer } from "./helpers";

/**
 * Services that had no test before 2026-11-10 (proposal 15): the workflow band and applications
 * box of a project, the client schemas, the planner feed, the API keys, the audit reader, the
 * setup overview and the health check.
 */
beforeEach(async () => {
  await resetDb();
  await seedLists();
});

async function aProject(name = "Extras") {
  const { id } = await createRow(await admin(), "projects", { name, status: "Progressing", client: "QIC", jobNo: "J-1" });
  return id;
}

const steps = (projectId: string) => db.select().from(schema.workflowStep).where(eq(schema.workflowStep.projectId, projectId)).orderBy(asc(schema.workflowStep.stepNo));

describe("project extras: the workflow band", () => {
  it("a new project gets the default steps; a lead renames, adds, removes and resets them", async () => {
    const id = await aProject();
    const l = await lead();
    const initial = await steps(id);
    expect(initial.map((s) => s.name)).toEqual([...DEFAULT_WORKFLOW_STEPS]);
    expect(initial.map((s) => s.stepNo)).toEqual(initial.map((_, i) => i + 1));

    await updateWorkflowStep(l, { id: initial[0]!.id, name: "Kick-off done", status: "Completed" });
    expect((await steps(id))[0]).toMatchObject({ name: "Kick-off done", status: "Completed" });
    await expect(updateWorkflowStep(l, { id: initial[0]!.id, name: "x", status: "Nearly" })).rejects.toThrow();
    await expect(updateWorkflowStep(l, { id: crypto.randomUUID(), name: "x", status: "Completed" })).rejects.toThrow(/Workflow step/);

    await addWorkflowStep(l, { projectId: id, name: "Handover to the client" });
    const added = await steps(id);
    expect(added.length).toBe(initial.length + 1);
    expect(added[added.length - 1]).toMatchObject({ name: "Handover to the client", stepNo: initial.length + 1 });

    // Removing a step in the middle renumbers the rest, so the circles stay 1 to n.
    await removeWorkflowStep(l, added[1]!.id);
    const after = await steps(id);
    expect(after.length).toBe(initial.length);
    expect(after.map((s) => s.stepNo)).toEqual(after.map((_, i) => i + 1));
    expect(after.map((s) => s.id)).not.toContain(added[1]!.id);
    await expect(removeWorkflowStep(l, crypto.randomUUID())).rejects.toThrow(/Workflow step/);

    await resetWorkflow(l, id);
    expect((await steps(id)).map((s) => s.name)).toEqual([...DEFAULT_WORKFLOW_STEPS]);
    await expect(resetWorkflow(l, crypto.randomUUID())).rejects.toThrow(/Project/);
  });

  it("is refused to a specialist and a viewer", async () => {
    const id = await aProject();
    const [first] = await steps(id);
    for (const actor of [await specialist(), await viewer()]) {
      await expect(updateWorkflowStep(actor, { id: first!.id, name: "x", status: "Completed" })).rejects.toThrow();
      await expect(addWorkflowStep(actor, { projectId: id, name: "x" })).rejects.toThrow();
      await expect(removeWorkflowStep(actor, first!.id)).rejects.toThrow();
      await expect(resetWorkflow(actor, id)).rejects.toThrow();
      await expect(addEnterpriseApp(actor, { projectId: id, name: "Portal" })).rejects.toThrow();
    }
  });
});

describe("project extras: the applications box", () => {
  it("adds applications in order, with or without a link, and removes one", async () => {
    const id = await aProject();
    const l = await lead();
    await addEnterpriseApp(l, { projectId: id, name: "3D Scene Viewer", url: "https://example.com/viewer" });
    await addEnterpriseApp(l, { projectId: id, name: "Dashboard", url: "" });
    const apps = await db.select().from(schema.enterpriseApp).where(eq(schema.enterpriseApp.projectId, id)).orderBy(asc(schema.enterpriseApp.sortOrder));
    expect(apps.map((a) => [a.name, a.url, a.sortOrder])).toEqual([
      ["3D Scene Viewer", "https://example.com/viewer", 1],
      ["Dashboard", null, 2],
    ]);
    await expect(addEnterpriseApp(l, { projectId: id, name: " " })).rejects.toThrow();
    await removeEnterpriseApp(l, apps[0]!.id);
    expect((await db.select().from(schema.enterpriseApp)).map((a) => a.name)).toEqual(["Dashboard"]);
    await expect(removeEnterpriseApp(l, apps[0]!.id)).rejects.toThrow(/Application/);
  });

  it("lists the projects in register order for the project filter", async () => {
    await aProject("Zulu");
    await aProject("Alpha");
    expect((await listProjectsBrief()).map((p) => p.name)).toEqual(["Zulu", "Alpha"]);
  });
});

describe("client schemas (Master Trackers)", () => {
  async function aSchema() {
    const [cs] = await db.insert(schema.clientSchema).values({ clientName: "QIC" }).returning();
    const fcs = await db
      .insert(schema.clientFeatureClass)
      .values([
        { clientSchemaId: cs!.id, sortOrder: 1, featureClass: "Road_Centreline", availability: "Available", status: "Approved" },
        { clientSchemaId: cs!.id, sortOrder: 2, featureClass: "Kerb", availability: "Partial", status: "In Progress" },
        { clientSchemaId: cs!.id, sortOrder: 3, featureClass: "Signage", availability: "Unavailable" },
      ])
      .returning();
    await db.insert(schema.clientField).values({ clientSchemaId: cs!.id, sortOrder: 1, featureClass: "Road_Centreline", fieldName: "ROAD_NAME" });
    await db.insert(schema.clientSubtype).values({ clientSchemaId: cs!.id, sortOrder: 1, featureClass: "Road_Centreline" });
    await db.insert(schema.clientDomain).values({ clientSchemaId: cs!.id, sortOrder: 1, domainName: "RoadClass" });
    return { cs: cs!, fcs };
  }

  it("an empty list on a new database, then the KPI tiles of each schema", async () => {
    const v = await viewer();
    expect(await listClientSchemas(v)).toEqual([]);
    const { cs } = await aSchema();
    const [view] = await listClientSchemas(v);
    expect(view).toMatchObject({ id: cs.id, clientName: "QIC", featureClasses: 3, available: 1, partial: 1, unavailable: 1, approved: 1, fields: 1, subtypes: 1, domains: 1 });

    const detail = await getClientSchema(v, cs.id);
    expect(detail.featureClasses.map((f) => f.featureClass)).toEqual(["Road_Centreline", "Kerb", "Signage"]);
    expect(detail.fields.length + detail.subtypes.length + detail.domains.length).toBe(3);
    await expect(getClientSchema(v, crypto.randomUUID())).rejects.toThrow(/Client schema/);
    await expect(getClientSchema(v, "not-an-id")).rejects.toThrow();
  });

  it("the specialist tracks a feature class; the lead only reads (RACI A9); a stale version is refused", async () => {
    const { cs, fcs } = await aSchema();
    const s = await specialist();
    const fc = fcs[2]!;
    await updateFeatureClass(s, { id: fc.id, version: fc.version, availability: "Available", gisComments: "Received from the client", status: "", notes: "" });
    const [saved] = await db.select().from(schema.clientFeatureClass).where(eq(schema.clientFeatureClass.id, fc.id));
    expect(saved).toMatchObject({ availability: "Available", gisComments: "Received from the client", status: null, version: fc.version + 1 });
    // The schema columns stay as imported.
    expect(saved!.featureClass).toBe("Signage");
    await expect(updateFeatureClass(s, { id: fc.id, version: fc.version, availability: "Partial" })).rejects.toThrow(/changed by someone else/);
    await expect(updateFeatureClass(s, { id: crypto.randomUUID(), version: 1 })).rejects.toThrow(/Feature class/);
    await expect(updateFeatureClass(await lead(), { id: fc.id, version: fc.version + 1, availability: "Partial" })).rejects.toThrow();

    await updateClientSchema(await manager(), { id: cs.id, version: cs.version, gisLead: "Rana", schemaVersion: "v2.1", notes: "" });
    expect((await getClientSchema(s, cs.id)).schema).toMatchObject({ gisLead: "Rana", schemaVersion: "v2.1", notes: null });
    await expect(updateClientSchema(await viewer(), { id: cs.id, version: cs.version + 1 })).rejects.toThrow();
    await expect(updateClientSchema(await manager(), { id: crypto.randomUUID(), version: 1 })).rejects.toThrow(/Client schema/);
  });

  it("only the administrator deletes a schema, with everything under it", async () => {
    const { cs } = await aSchema();
    await expect(deleteClientSchema(await manager(), cs.id)).rejects.toThrow();
    await deleteClientSchema(await admin(), cs.id);
    expect(await listClientSchemas(await viewer())).toEqual([]);
    expect((await db.select().from(schema.clientFeatureClass)).length).toBe(0);
    expect((await db.select().from(schema.clientField)).length).toBe(0);
    await expect(deleteClientSchema(await admin(), cs.id)).rejects.toThrow(/Client schema/);
  });
});

describe("feed for the Resource Planner", () => {
  it("answers on an empty database", async () => {
    const feed = await feedProjects();
    expect(feed.projects).toEqual([]);
    expect(feed.period).toBeNull();
    expect((await feedRegister("packages", null)).rows).toEqual([]);
  });

  it("carries the project, its calculated columns and the registers, filtered by project", async () => {
    const a = await admin();
    await regeneratePeriods(a, { startDate: "2026-01-05", count: 60 });
    const id = await aProject("Fed project");
    const other = await aProject("Other project");
    await db.update(schema.project).set({ latitude: "25.200000", longitude: "55.300000", locationLabel: "Dubai" }).where(eq(schema.project.id, id));
    await createRow(a, "packages", { projectId: id, designStage: "DD - Detailed Design", discipline: "Roads & Highways", description: "Road network", status: "Approved" });
    await createRow(a, "packages", { projectId: other, designStage: "DD - Detailed Design", discipline: "Utilities", description: "Wet utilities", status: "In Progress" });

    const feed = await feedProjects();
    expect(feed.period).not.toBeNull();
    const p = feed.projects.find((x) => x.name === "Fed project")!;
    expect(p).toMatchObject({ id, jobNo: "J-1", client: "QIC", status: "Progressing", crs: { open: 0, inReview: 0, closed: 0 }, location: { lat: 25.2, lng: 55.3, label: "Dubai" } });
    expect(p.delivered).toContain("Approved");
    expect(feed.projects.find((x) => x.name === "Other project")!.location).toBeNull();

    expect((await feedRegister("packages", null)).rows.length).toBe(2);
    const mine = (await feedRegister("packages", id)).rows;
    expect(mine.length).toBe(1);
    expect(mine[0]!.description).toBe("Road network");
    expect((await feedRegister("updates", id)).rows).toEqual([]);
    expect((await feedRegister("schema", id)).rows).toEqual([]);
  });

  it("runs as a global system actor that is not a user", () => {
    const actor = systemActor("feed");
    expect(actor.roles).toEqual([{ role: "ADMINISTRATOR", scopeType: "GLOBAL", scopeId: null }]);
    expect(actor.email).toBe("feed@system.local");
  });
});

describe("API keys", () => {
  it("creates a key shown once, stores only its hash, authenticates it and revokes it", async () => {
    const a = await admin();
    expect(await listApiKeys(a)).toEqual([]);
    const { key, row } = await createApiKey(a, { name: "Resource Planner" });
    expect(key.startsWith("rpk_")).toBe(true);
    expect(row.prefix).toBe(key.slice(0, 10));
    expect(row.keyHash).toBe(hashKey(key));
    expect(JSON.stringify(row)).not.toContain(key);
    expect(row.scopes).toEqual(["hub:read"]);

    const principal = await authenticateApiKey(` ${key} `);
    expect(principal).toMatchObject({ keyId: row.id, name: "Resource Planner", scopes: ["hub:read"] });
    const [used] = await listApiKeys(a);
    expect(used!.lastUsedAt).toBeInstanceOf(Date);

    // Missing, malformed and unknown keys are all simply not authenticated.
    expect(await authenticateApiKey(null)).toBeNull();
    expect(await authenticateApiKey("")).toBeNull();
    expect(await authenticateApiKey("not-a-key")).toBeNull();
    expect(await authenticateApiKey("rpk_unknown")).toBeNull();

    await revokeApiKey(a, row.id);
    expect(await authenticateApiKey(key)).toBeNull();
    await expect(revokeApiKey(a, row.id)).rejects.toThrow(/already revoked/);

    // The audit log names the key by its prefix, never by its value.
    const log = await listAudit(a, { entityType: "api_key" });
    expect(log.items.map((x) => x.action).sort()).toEqual(["apiKey.create", "apiKey.revoke"]);
    expect(JSON.stringify(log.items)).not.toContain(key);
  });

  it("validates the name and belongs to the administrator only", async () => {
    const a = await admin();
    await expect(createApiKey(a, { name: "x" })).rejects.toThrow(/2 to 80/);
    await expect(createApiKey(a, {})).rejects.toThrow(/2 to 80/);
    await expect(createApiKey(a, { name: "y".repeat(81) })).rejects.toThrow(/2 to 80/);
    for (const actor of [await manager(), await lead(), await viewer()]) {
      await expect(createApiKey(actor, { name: "Mine" })).rejects.toThrow();
      await expect(listApiKeys(actor)).rejects.toThrow();
      await expect(revokeApiKey(actor, crypto.randomUUID())).rejects.toThrow();
    }
  });
});

describe("audit reader", () => {
  it("filters by entity, action and date, pages the result and names the actor", async () => {
    const a = await admin();
    const id = await aProject("Audited");
    await aProject("Audited too");
    const l = await lead();
    await addEnterpriseApp(l, { projectId: id, name: "Portal" });

    const all = await listAudit(a);
    expect(all.total).toBeGreaterThanOrEqual(3);
    // Newest first.
    expect(all.items[0]!.action).toBe("app.add");
    expect(all.items[0]!.actorEmail).toBe(l.email);

    const projects = await listAudit(a, { entityType: "project", action: "project.create" });
    expect(projects.total).toBe(2);
    const one = await listAudit(a, { entityType: "project", entityId: id });
    expect(one.items.map((x) => x.action)).toEqual(["project.create"]);
    expect(one.items[0]!.after).toMatchObject({ name: "Audited" });

    for (let i = 0; i < 5; i++) await aProject(`Page filler ${i}`);
    const paged = await listAudit(a, { entityType: "project", page: 2, pageSize: 5 });
    expect(paged).toMatchObject({ total: 7, page: 2, pageSize: 5 });
    expect(paged.items.length).toBe(2);
    await expect(listAudit(a, { pageSize: 1 })).rejects.toThrow();

    const today = new Date().toISOString().slice(0, 10);
    expect((await listAudit(a, { from: today, to: today })).total).toBe(all.total + 5);
    expect((await listAudit(a, { to: "2020-01-01" })).total).toBe(0);
    expect((await listAudit(a, { from: "2999-01-01" })).total).toBe(0);
  });

  it("is for the administrator; the history panel of one record needs no extra right", async () => {
    const id = await aProject("History");
    await expect(listAudit(await manager())).rejects.toThrow();
    await expect(listAudit(await viewer())).rejects.toThrow();
    const history = await historyFor("project", id);
    expect(history.map((x) => x.action)).toEqual(["project.create"]);
    expect(await historyFor("project", crypto.randomUUID())).toEqual([]);
    expect((await historyFor("project", id, 0)).length).toBe(0);
  });
});

describe("setup overview and health", () => {
  it("shows the setup steps to the administrator until they are done, and none to the others", async () => {
    await resetDb();
    const a = await admin();
    const empty = await getOverview(a);
    expect(empty.counts).toMatchObject({ projects: 0, lists: 0, periods: 0 });
    expect(empty.setup.map((s) => s.done)).toEqual([false, false, false, false]);

    await seedLists();
    await regeneratePeriods(a, { startDate: "2026-01-05", count: 4 });
    await manager();
    await aProject("First");
    const done = await getOverview(a);
    expect(done.setup.every((s) => s.done)).toBe(true);
    expect(done.counts).toMatchObject({ projects: 1, periods: 4 });
    expect((await getOverview(await viewer())).setup).toEqual([]);
  });

  it("reports a healthy database", async () => {
    expect(await checkDatabaseHealth()).toBe(true);
  });
});
