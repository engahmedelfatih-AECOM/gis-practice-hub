import { beforeEach, describe, expect, it } from "vitest";
import {
  countRows,
  createRow,
  deleteRow,
  editableFields,
  getRow,
  listRows,
  moveRow,
  PAGE_SIZE,
  updateRow,
} from "@/application/hub/registers";
import { REGISTERS } from "@/domain/hub/registers";
import { addListValue, deleteListValue, listAll, listValues, updateListValue } from "@/application/hub/lists";
import { createPeriod, deletePeriod, listPeriods, regeneratePeriods, resolvePeriod, updatePeriod } from "@/application/hub/periods";
import { getSetting, listSettings, updateSetting } from "@/application/settings/settings";
import { admin, db, lead, manager, resetDb, schema, seedLists, specialist, viewer } from "./helpers";

beforeEach(async () => {
  await resetDb();
  await seedLists();
});

/** A project, a package on it and a resource row that puts the project in one hub. */
async function sampleProject(name: string, hub: string) {
  const a = await admin();
  const { id } = await createRow(a, "projects", { name, status: "Progressing" });
  await createRow(a, "packages", {
    projectId: id,
    designStage: "DD - Detailed Design",
    discipline: "Roads & Highways",
    description: "Road network",
    status: "In Progress",
    plannedSubmission: "2026-12-01",
    progressPct: "20",
  });
  await db.insert(schema.resourceRow).values({ projectId: id, name: `Person ${name}`, hub, sortOrder: 1 });
  return id;
}

describe("registers service", () => {
  it("creates, reads, updates, reorders, counts and deletes a row", async () => {
    const a = await admin();
    const { id } = await createRow(a, "projects", { name: "Service test", status: "Not Started" });
    const row = await getRow(a, "projects", id);
    expect(row.name).toBe("Service test");
    expect(row.version).toBe(1);

    await updateRow(a, "projects", { __register: "projects", id, version: row.version, name: "Service test", status: "Progressing" });
    expect((await getRow(a, "projects", id)).status).toBe("Progressing");

    const { id: second } = await createRow(a, "projects", { name: "Second", status: "Not Started" });
    expect(await countRows(a, "projects", {})).toBe(2);
    await moveRow(a, "projects", second, "up");
    expect((await listRows(a, "projects", {}))[0]!.name).toBe("Second");

    expect((await listRows(a, "projects", { q: "Service" })).length).toBe(1);
    expect((await listRows(a, "projects", { limit: 1, offset: 1 })).length).toBe(1);
    expect(PAGE_SIZE).toBeGreaterThan(0);

    await deleteRow(a, "projects", second);
    expect(await countRows(a, "projects", {})).toBe(1);
  });

  it("refuses a value that is not on the Lists sheet", async () => {
    const a = await admin();
    await expect(createRow(a, "projects", { name: "Bad status", status: "Nearly done" })).rejects.toThrow(
      /correct the highlighted fields/i,
    );
  });

  it("refuses the wrong version (two people editing one row)", async () => {
    const a = await admin();
    const { id } = await createRow(a, "projects", { name: "Locking", status: "Not Started" });
    await updateRow(a, "projects", { __register: "projects", id, version: 1, name: "Locking", status: "Progressing" });
    await expect(
      updateRow(a, "projects", { __register: "projects", id, version: 1, name: "Locking", status: "At Risk" }),
    ).rejects.toThrow();
  });

  it("lets a GIS Specialist change the progress columns of a package and nothing else", async () => {
    const a = await admin();
    const projectId = await sampleProject("Specialist", "India");
    const [pkg] = await listRows(a, "packages", { projectId });
    const s = await specialist();

    // The form posts every field, so the payload carries the plan columns unchanged.
    const base = {
      __register: "packages",
      id: pkg!.id,
      projectId: projectId,
      designStage: "DD - Detailed Design",
      discipline: "Roads & Highways",
      description: "Road network",
      plannedSubmission: "2026-12-01",
    };

    // Progress columns: allowed.
    await updateRow(s, "packages", {
      ...base,
      version: pkg!.version,
      status: "Internal QA/QC",
      progressPct: "60",
      remarks: "Internal check done",
      gisStartDate: "2026-11-02",
    });
    const after = await getRow(a, "packages", pkg!.id);
    expect(after.progressPct).toBe(60);
    expect(after.status).toBe("Internal QA/QC");
    expect(after.remarks).toBe("Internal check done");

    // A plan column: refused, with the field named.
    await expect(
      updateRow(s, "packages", { ...base, version: after.version, status: "Internal QA/QC", plannedSubmission: "2027-01-01" }),
    ).rejects.toThrow(/Planned Submission/);

    // A status beyond the internal QA/QC: refused.
    await expect(
      updateRow(s, "packages", { ...base, version: after.version, status: "Submitted" }),
    ).rejects.toThrow(/Internal QA\/QC/);

    // A specialist adds no rows and deletes none.
    await expect(
      createRow(s, "packages", { projectId, designStage: "DD - Detailed Design", discipline: "Roads & Highways", status: "Not Started" }),
    ).rejects.toThrow();
    await expect(deleteRow(s, "packages", pkg!.id)).rejects.toThrow();
  });

  it("narrows the form for the role that may only report progress", async () => {
    const s = await specialist();
    const l = await lead();
    const pkgs = REGISTERS.packages;
    const forSpecialist = editableFields(s, pkgs);
    expect(forSpecialist.readOnly.has("plannedSubmission")).toBe(true);
    expect(forSpecialist.readOnly.has("progressPct")).toBe(false);
    expect(forSpecialist.options.status).toEqual(["Not Started", "In Progress", "Internal QA/QC"]);
    const forLead = editableFields(l, pkgs);
    expect(forLead.readOnly.size).toBe(0);
    expect(forLead.options.status).toBeUndefined();
  });

  it("refuses a reader every write", async () => {
    const v = await viewer();
    await expect(createRow(v, "projects", { name: "No", status: "Not Started" })).rejects.toThrow();
    expect((await listRows(v, "projects", {})).length).toBe(0);
  });
});

describe("lists service", () => {
  it("adds, updates and deletes a dropdown value, and hides an inactive one", async () => {
    const m = await manager();
    await addListValue(m, { listKey: "region", value: "Cairo" });
    const all = await listAll(m);
    const added = all.region.find((r) => r.value === "Cairo")!;
    expect(added.sortOrder).toBeGreaterThan(0);
    expect(added.isActive).toBe(true);

    await updateListValue(m, { id: added.id, value: "Cairo hub", group: "", isActive: "on" });
    expect((await listAll(m)).region.find((r) => r.id === added.id)!.value).toBe("Cairo hub");

    await updateListValue(m, { id: added.id, value: "Cairo hub", group: "", isActive: "false" });
    expect((await listValues("region")).some((r) => r.id === added.id)).toBe(false);

    await deleteListValue(m, added.id);
    expect((await listAll(m)).region.some((r) => r.id === added.id)).toBe(false);
  });

  it("keeps the dropdown lists away from the roles that do not own them", async () => {
    const l = await lead();
    await expect(listAll(l)).rejects.toThrow();
    await expect(addListValue(l, { listKey: "region", value: "Nope" })).rejects.toThrow();
  });

  it("refuses an empty value and an unknown list", async () => {
    const m = await manager();
    await expect(addListValue(m, { listKey: "region", value: " " })).rejects.toThrow();
    await expect(addListValue(m, { listKey: "not-a-list", value: "x" })).rejects.toThrow();
    await expect(deleteListValue(m, crypto.randomUUID())).rejects.toThrow(/List value/);
  });
});

describe("periods service", () => {
  it("creates one period, regenerates the calendar, updates and deletes", async () => {
    const m = await manager();
    await createPeriod(m, { startDate: "2026-11-09", endDate: "" });
    const [one] = await listPeriods();
    // The default length comes from the settings (14 days), so the end date is filled in.
    expect(one!.endDate).toBe("2026-11-22");
    expect(one!.label).toContain("2026");

    const n = await regeneratePeriods(m, { startDate: "2026-01-05", count: 26 });
    expect(n).toBe(26);
    const periods = await listPeriods();
    expect(periods.length).toBe(26);
    expect(periods[0]!.startDate).toBe("2026-01-05");

    await updatePeriod(m, { id: periods[0]!.id, startDate: "2026-01-05", endDate: "2026-01-19" });
    await expect(updatePeriod(m, { id: periods[0]!.id, startDate: "2026-02-01", endDate: "2026-01-01" })).rejects.toThrow(/end date/i);
    await expect(createPeriod(m, { startDate: "2026-02-01", endDate: "2026-01-01" })).rejects.toThrow(/end date/i);

    await deletePeriod(m, periods[0]!.id);
    expect((await listPeriods()).length).toBe(25);
    await expect(deletePeriod(m, crypto.randomUUID())).rejects.toThrow(/Report period/);
  });

  it("resolves the period to show, and refuses the calendar to a lead", async () => {
    const m = await manager();
    await regeneratePeriods(m, { startDate: "2026-01-05", count: 4 });
    const periods = await listPeriods();
    const asked = await resolvePeriod(periods[2]!.id);
    expect(asked!.id).toBe(periods[2]!.id);
    // An unknown id falls back to the default period rather than failing.
    expect((await resolvePeriod(crypto.randomUUID()))!.id).toBeTruthy();
    expect((await resolvePeriod(null))!.id).toBeTruthy();

    const l = await lead();
    await expect(createPeriod(l, { startDate: "2026-11-09", endDate: "" })).rejects.toThrow();
  });
});

describe("settings service", () => {
  it("lists the settings with their defaults and stores a new value", async () => {
    const a = await admin();
    const before = await listSettings(a);
    expect(before.every((s) => s.isDefault)).toBe(true);
    expect(before.some((s) => s.key === "report.periodDays")).toBe(true);

    await updateSetting(a, "report.periodDays", 7);
    expect(await getSetting("report.periodDays")).toBe(7);
    const after = await listSettings(a);
    expect(after.find((s) => s.key === "report.periodDays")!.isDefault).toBe(false);
    expect(after.find((s) => s.key === "report.periodDays")!.updatedAt).not.toBeNull();

    // Writing the same key again replaces the value instead of failing.
    await updateSetting(a, "report.periodDays", 14);
    expect(await getSetting("report.periodDays")).toBe(14);
  });

  it("refuses an unknown key, an invalid value and a role that does not own the settings", async () => {
    const a = await admin();
    await expect(updateSetting(a, "report.nothing", 1)).rejects.toThrow(/Unknown setting/);
    await expect(updateSetting(a, "report.periodDays", -3)).rejects.toThrow(/Invalid value/);
    const m = await manager();
    await expect(listSettings(m)).rejects.toThrow();
    await expect(updateSetting(m, "report.periodDays", 7)).rejects.toThrow();
  });
});
