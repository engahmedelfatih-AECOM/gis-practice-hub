import { readFileSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { feedProjects } from "@/application/hub/feed";
import { importHubWorkbook } from "@/application/hub/import";
import { createRow, getRow, setProjectNumbers, updateRow } from "@/application/hub/registers";
import { admin, db, resetDb, schema, seedLists, viewer } from "./helpers";

beforeEach(async () => {
  await resetDb();
  await seedLists();
});

const fixture = () => readFileSync(path.join(process.cwd(), "tests/fixtures/GIS_Practice_Hub_sample.xlsx"));

/** The sample workbook with a "Project Number" column added at the end of the Projects sheet. */
async function fixtureWithNumbers(numbers: Record<string, string>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fixture() as unknown as ArrayBuffer);
  const ws = wb.getWorksheet("Projects")!;
  const header = ws.getRow(5);
  let nameCol = 0;
  let last = 0;
  header.eachCell((cell, col) => {
    if (String(cell.value).trim() === "Project Name") nameCol = col;
    last = Math.max(last, col);
  });
  const col = last + 1;
  header.getCell(col).value = "Project Number";
  for (let r = 6; r <= ws.rowCount; r++) {
    const name = String(ws.getRow(r).getCell(nameCol).value ?? "").trim();
    if (numbers[name]) ws.getRow(r).getCell(col).value = numbers[name];
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const numberOf = async (name: string) => (await db.select().from(schema.project).where(eq(schema.project.name, name)))[0]?.projectNumber ?? null;

describe("Project Number on the Hub project (proposal 02)", () => {
  it("is saved on the form, is optional, and is unique", async () => {
    const a = await admin();
    const { id } = await createRow(a, "projects", { name: "With number", status: "Not Started", projectNumber: " 60712345 " });
    expect((await getRow(a, "projects", id)).projectNumber).toBe("60712345");
    // Two projects without a number are fine: empty is stored as no value, not as an empty text.
    await createRow(a, "projects", { name: "No number A", status: "Not Started", projectNumber: "" });
    await createRow(a, "projects", { name: "No number B", status: "Not Started" });
    expect(await numberOf("No number A")).toBeNull();
    await expect(createRow(a, "projects", { name: "Same number", status: "Not Started", projectNumber: "60712345" })).rejects.toThrow(/number is already in use/i);

    const row = await getRow(a, "projects", id);
    await updateRow(a, "projects", { id, version: row.version, name: "With number", status: "Not Started", projectNumber: "60799999" });
    expect(await numberOf("With number")).toBe("60799999");
  });

  it("is in the feed for the Resource Planner", async () => {
    const a = await admin();
    await createRow(a, "projects", { name: "Fed", status: "Not Started", projectNumber: "60700001" });
    const feed = await feedProjects();
    expect(feed.projects.find((p) => p.name === "Fed")!.projectNumber).toBe("60700001");
  });

  it("fills the numbers of the existing projects in one save", async () => {
    const a = await admin();
    const one = await createRow(a, "projects", { name: "One", status: "Not Started" });
    const two = await createRow(a, "projects", { name: "Two", status: "Not Started" });
    expect(await setProjectNumbers(a, { [`number:${one.id}`]: "N-1", [`number:${two.id}`]: "N-2", other: "ignored" })).toBe(2);
    // Saving the same values again writes nothing.
    expect(await setProjectNumbers(a, { [`number:${one.id}`]: "N-1", [`number:${two.id}`]: "N-2" })).toBe(0);
    // Two projects swap their numbers in one save; an empty field clears.
    expect(await setProjectNumbers(a, { [`number:${one.id}`]: "N-2", [`number:${two.id}`]: "N-1" })).toBe(2);
    expect(await numberOf("One")).toBe("N-2");
    expect(await setProjectNumbers(a, { [`number:${one.id}`]: "" })).toBe(1);
    expect(await numberOf("One")).toBeNull();
    // The same number on two rows is refused before anything is written.
    await expect(setProjectNumbers(a, { [`number:${one.id}`]: "N-9", [`number:${two.id}`]: "n-9" })).rejects.toThrow(/two projects/);
    expect(await numberOf("Two")).toBe("N-1");
    // Each change is in the audit log.
    const audit = await db.select().from(schema.auditLog).where(eq(schema.auditLog.entityId, one.id));
    expect(audit.filter((x) => x.action === "project.update").length).toBe(3);
    // A viewer cannot.
    await expect(setProjectNumbers(await viewer(), { [`number:${one.id}`]: "N-5" })).rejects.toThrow();
  });

  it("the import keeps the numbers and the map location when the sheet has no such column", async () => {
    const a = await admin();
    await importHubWorkbook(a, { name: "hub.xlsx", buffer: fixture() }, false);
    const [p] = await db.select().from(schema.project).where(eq(schema.project.name, "QIC D9"));
    await db.update(schema.project).set({ projectNumber: "60700009", latitude: "25.100000", longitude: "51.200000", locationLabel: "Doha" }).where(eq(schema.project.id, p!.id));

    const again = await importHubWorkbook(a, { name: "hub.xlsx", buffer: fixture() }, false);
    const [after] = await db.select().from(schema.project).where(eq(schema.project.id, p!.id));
    expect(after!.projectNumber).toBe("60700009");
    expect(after!.latitude).toBe("25.100000");
    expect(after!.locationLabel).toBe("Doha");
    // The team is told once, in one line.
    expect(again.warnings.filter((w) => w.includes("no Project Number column")).length).toBe(1);
  });

  it("the import reads a Project Number column when the sheet has one", async () => {
    const a = await admin();
    const buffer = await fixtureWithNumbers({ "QIC D9": "60700009", "Laheq Island": "60700001", "Masdar City": "60700009" });
    const run = await importHubWorkbook(a, { name: "hub.xlsx", buffer }, false);
    expect(await numberOf("Laheq Island")).toBe("60700001");
    // Masdar City is above QIC D9 on the sheet, so it keeps the number. The same number on the
    // second project is left out with a warning; the import goes on.
    expect(await numberOf("Masdar City")).toBe("60700009");
    expect(await numberOf("QIC D9")).toBeNull();
    expect(run.warnings.filter((w) => w.includes("Project Number 60700009 is already used")).length).toBe(1);
    expect(run.warnings.filter((w) => w.includes("no Project Number column")).length).toBe(0);
    expect(run.registers.find((r) => r.key === "projects")!.inserted).toBe(10);
  });
});
