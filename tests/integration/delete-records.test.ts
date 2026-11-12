import { and, desc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createRow, deleteRow, rowUsage } from "@/application/hub/registers";
import { deleteListValue, listAll } from "@/application/hub/lists";
import {
  deletePeriod,
  listPeriods,
  periodUsage,
  regeneratePeriods,
  setCurrentPeriod,
} from "@/application/hub/periods";
import { OWNED_PARTS } from "@/application/hub/delete-rules";
import { referencingKeys } from "@/application/shared/usage";
import {
  admin,
  db,
  lead,
  makeActor,
  manager,
  resetDb,
  schema,
  seedLists,
  specialist,
  viewer,
} from "./helpers";

/**
 * "Delete a record created by mistake" (decision 2026-11-12): a record goes only when nothing uses
 * it, counted from every foreign key in the catalogue plus the links without a key; owned parts go
 * with it; every delete is audited with the deleted row as "before".
 */

async function lastAudit(action: string) {
  const [row] = await db
    .select()
    .from(schema.auditLog)
    .where(eq(schema.auditLog.action, action))
    .orderBy(desc(schema.auditLog.id))
    .limit(1);
  return row;
}

async function newProject(name: string) {
  const { id } = await createRow(await admin(), "projects", { name, status: "Not Started" });
  return id;
}

beforeEach(async () => {
  await resetDb();
  await seedLists();
});

describe("owned parts and the catalogue", () => {
  it("reads every foreign key that points at project, with its ON DELETE rule", async () => {
    const refs = await referencingKeys(db, "project");
    const byTable = Object.fromEntries(refs.map((r) => [r.table, r.onDelete]));
    // Cascade and set-null keys are counted too, not only restrict ones.
    expect(byTable).toMatchObject({
      package: "cascade",
      update_item: "cascade",
      risk: "set null",
      rfi: "set null",
      schema_feature: "set null",
    });
  });

  it("every owned part is ON DELETE CASCADE, so it goes with its record", async () => {
    for (const [table, parts] of Object.entries(OWNED_PARTS)) {
      const refs = await referencingKeys(db, table);
      for (const part of parts) {
        expect(refs.find((r) => r.table === part)?.onDelete, `${part} -> ${table}`).toBe("cascade");
      }
    }
  });
});

describe("registers", () => {
  it("deletes an unused project with its owned parts and writes the audit row", async () => {
    const id = await newProject("Created by mistake");
    await db.insert(schema.enterpriseApp).values({ projectId: id, name: "Portal" });
    expect(
      (await db.select().from(schema.workflowStep).where(eq(schema.workflowStep.projectId, id)))
        .length,
    ).toBeGreaterThan(0);

    await deleteRow(await manager(), "projects", id);

    expect(await db.select().from(schema.project).where(eq(schema.project.id, id))).toHaveLength(0);
    expect(
      await db.select().from(schema.workflowStep).where(eq(schema.workflowStep.projectId, id)),
    ).toHaveLength(0);
    expect(
      await db.select().from(schema.enterpriseApp).where(eq(schema.enterpriseApp.projectId, id)),
    ).toHaveLength(0);
    const audit = await lastAudit("project.delete");
    expect(audit?.entityId).toBe(id);
    expect((audit?.before as { name?: string }).name).toBe("Created by mistake");
  });

  it("refuses a project in use, whatever the ON DELETE rule of the key, and changes nothing", async () => {
    const id = await newProject("In use");
    await db.insert(schema.pkg).values({ projectId: id, designStage: "DD", discipline: "Roads" }); // cascade key
    await db.insert(schema.risk).values({ projectId: id, title: "Late data" }); // set-null key
    await db.insert(schema.risk).values({ projectId: id, title: "Scope creep" });

    const usage = (await rowUsage(await manager(), "projects", [{ id, name: "In use" }]))!.get(id)!;
    expect(usage.note).toBe("Used by 1 package and 2 risks. Set its Project Status instead.");
    await expect(deleteRow(await manager(), "projects", id)).rejects.toThrow(
      /Used by 1 package and 2 risks/,
    );

    expect(await db.select().from(schema.project).where(eq(schema.project.id, id))).toHaveLength(1);
    expect(await db.select().from(schema.risk).where(eq(schema.risk.projectId, id))).toHaveLength(
      2,
    );
    expect(await lastAudit("project.delete")).toBeUndefined();
  });

  it("counts a Schema Tracker row that names the project only by its label", async () => {
    const id = await newProject("Label only");
    await db
      .insert(schema.schemaFeature)
      .values({ projectLabel: "Label only", featureClass: "Road_Centreline" });
    await expect(deleteRow(await manager(), "projects", id)).rejects.toThrow(/1 schema row/);
  });

  it("checks again at delete time: a package added after the page was drawn blocks the delete", async () => {
    const id = await newProject("Race");
    const m = await manager();
    expect((await rowUsage(m, "projects", [{ id, name: "Race" }]))!.get(id)!.note).toBeNull();
    await db.insert(schema.pkg).values({ projectId: id, designStage: "DD", discipline: "Roads" });
    await expect(deleteRow(m, "projects", id)).rejects.toThrow(/Used by 1 package/);
  });

  it("deletes a row nothing points at (a risk) and audits it", async () => {
    const [r] = await db.insert(schema.risk).values({ title: "Typed twice" }).returning();
    await deleteRow(await lead(), "risks", r!.id);
    expect(await db.select().from(schema.risk).where(eq(schema.risk.id, r!.id))).toHaveLength(0);
    expect((await lastAudit("risk.delete"))?.entityId).toBe(r!.id);
  });

  it("keeps the last resource row of a person another register still names", async () => {
    const [one] = await db.insert(schema.resourceRow).values({ name: "Jane Doe" }).returning();
    await db.insert(schema.risk).values({ title: "Data late", owner: "Jane Doe" });
    await expect(deleteRow(await lead(), "resources", one!.id)).rejects.toThrow(
      /1 risk naming Jane Doe/,
    );
    // With a second row for the same person, the first can go: the name stays in the dropdowns.
    await db.insert(schema.resourceRow).values({ name: "Jane Doe" });
    await deleteRow(await lead(), "resources", one!.id);
  });

  it("deletes only for the roles that may add the row, and offers no control to the others", async () => {
    const projectId = await newProject("Owner check");
    const [p] = await db
      .insert(schema.pkg)
      .values({ projectId, designStage: "DD", discipline: "Roads" })
      .returning();
    // Packages are planned (added) by the GIS Lead; the GIS Specialist only updates progress.
    await expect(deleteRow(await specialist(), "packages", p!.id)).rejects.toThrow();
    expect(await rowUsage(await specialist(), "packages", [p!])).toBeNull();
    // Projects belong to the GIS Manager (RACI): a lead may not delete one.
    await expect(deleteRow(await lead(), "projects", projectId)).rejects.toThrow();
    expect(await rowUsage(await viewer(), "risks", [])).toBeNull();
    await deleteRow(await lead(), "packages", p!.id);
  });
});

describe("Lists values", () => {
  it("deletes an unused value and refuses one a register row uses", async () => {
    const m = await manager();
    const lists = await listAll(m);
    const progressing = lists.projectStatus.find((v) => v.value === "Progressing")!;
    expect(progressing.usedBy).toBeNull();
    await newProject("Uses Progressing").then((id) =>
      db.update(schema.project).set({ status: "Progressing" }).where(eq(schema.project.id, id)),
    );
    const after = (await listAll(m)).projectStatus.find((v) => v.id === progressing.id)!;
    expect(after.usedBy).toBe("Used by 1 project. Deactivate it instead.");
    await expect(deleteListValue(m, progressing.id)).rejects.toThrow(/Deactivate it instead/);

    const [extra] = await db
      .insert(schema.listItem)
      .values({ listKey: "projectStatus", value: "Typo", sortOrder: 99 })
      .returning();
    await deleteListValue(m, extra!.id);
    expect((await lastAudit("list.delete"))?.entityId).toBe(extra!.id);
  });

  it("counts a discipline inside a multi-discipline package cell", async () => {
    const m = await manager();
    const id = await newProject("Multi");
    await db
      .insert(schema.pkg)
      .values({
        projectId: id,
        designStage: "DD",
        discipline: "Roads & Highways, Stormwater Drainage",
      });
    const lists = await listAll(m);
    for (const value of ["Roads & Highways", "Stormwater Drainage"]) {
      expect(lists.discipline.find((v) => v.value === value)!.usedBy).toMatch(
        /^Used by 1 package\./,
      );
    }
  });

  it("refuses a region that a role grant is scoped to, even without a foreign key", async () => {
    const m = await manager();
    const [region] = await db
      .insert(schema.listItem)
      .values({ listKey: "region", value: "Cairo", sortOrder: 50 })
      .returning();
    await makeActor([{ role: "GIS_LEAD", scopeType: "REGION", scopeId: region!.id }]);
    await expect(deleteListValue(m, region!.id)).rejects.toThrow(/1 role scope/);
    expect(
      await db
        .select()
        .from(schema.listItem)
        .where(and(eq(schema.listItem.id, region!.id))),
    ).toHaveLength(1);
  });
});

describe("Report periods", () => {
  it("refuses a period with updates in it or set as current, deletes an empty one", async () => {
    const m = await manager();
    await regeneratePeriods(m, { startDate: "2026-01-05", count: 3 });
    const [first, second, third] = await listPeriods();
    const projectId = await newProject("Reported");
    await db
      .insert(schema.updateItem)
      .values({
        projectId,
        periodFrom: first!.startDate,
        type: "Accomplishment",
        description: "Done",
      });
    await setCurrentPeriod(m, second!.id);

    const usage = await periodUsage(m, [first!, second!, third!]);
    expect(usage.get(first!.id)!.note).toMatch(/Used by 1 update/);
    expect(usage.get(second!.id)!.note).toMatch(/current report period setting/);
    await expect(deletePeriod(m, first!.id)).rejects.toThrow(/1 update/);
    await expect(deletePeriod(m, second!.id)).rejects.toThrow(/current report period/);

    await deletePeriod(m, third!.id);
    expect((await lastAudit("period.delete"))?.entityId).toBe(third!.id);
  });
});
