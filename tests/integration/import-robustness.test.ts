import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it } from "vitest";
import { importHubWorkbook } from "@/application/hub/import";
import { listRows } from "@/application/hub/registers";
import { admin, resetDb, seedLists } from "./helpers";

/**
 * Import robustness (report 2026-11-02, section 6). Each case is a small workbook written here,
 * so the behaviour is pinned without the sample file: a value outside a list, a typed date, a
 * missing sheet, a row whose project is not on the Projects sheet, empty and formula-only rows,
 * an extra sheet, an extra column and a file that is not a workbook.
 */
beforeEach(async () => {
  await resetDb();
  await seedLists();
});

type Row = (string | number | null)[];

/** A workbook in the shape the Hub reads: titles above, headers on row 5, data from row 6. */
async function workbook(sheets: { name: string; headers: string[]; rows: Row[] }[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name);
    ws.getCell("B1").value = s.name.toUpperCase();
    s.headers.forEach((h, i) => {
      ws.getRow(5).getCell(i + 1).value = h;
    });
    s.rows.forEach((r, ri) => {
      r.forEach((v, ci) => {
        ws.getRow(6 + ri).getCell(ci + 1).value = v;
      });
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const PROJECT_HEADERS = ["#", "Project Name", "Client", "Current Design Stage", "Project Status", "GIS Lead"];
const PACKAGE_HEADERS = ["#", "Project", "Design Stage", "Discipline", "Package / Description", "Status", "Planned Submission", "Progress %"];

const has = (warnings: string[], needle: string | RegExp) =>
  warnings.some((w) => (typeof needle === "string" ? w.includes(needle) : needle.test(w)));

describe("import robustness", () => {
  it("skips a row whose key cell is empty and reports it once per sheet", async () => {
    const a = await admin();
    const buffer = await workbook([
      {
        name: "Projects",
        headers: PROJECT_HEADERS,
        rows: [
          [1, "Alpha", "Client A", "DD - Detailed Design", "Progressing", "Ahmed"],
          [2, null, null, null, null, null],
          [3, null, "Client C", null, "Progressing", null],
          [4, "Delta", "Client D", "DD - Detailed Design", "Progressing", null],
        ],
      },
    ]);
    const s = await importHubWorkbook(a, { name: "small.xlsx", buffer }, false);
    const projects = s.registers.find((r) => r.key === "projects")!;
    expect(projects.inserted).toBe(2);
    // The wholly empty row is not reported; the one with data but no name is.
    expect(projects.skipped).toBe(1);
    expect(s.warnings.filter((w) => w.includes("skipped because")).length).toBe(1);
    expect(has(s.warnings, "Project Name is empty")).toBe(true);
  });

  it("warns and clears a value that is not on the list, and skips the row when the field is required", async () => {
    const a = await admin();
    const buffer = await workbook([
      {
        name: "Projects",
        headers: PROJECT_HEADERS,
        rows: [
          [1, "Good", "C", "DD - Detailed Design", "Progressing", "Ahmed"],
          [2, "Bad status", "C", "DD - Detailed Design", "Nearly done", "Ahmed"],
        ],
      },
      {
        name: "Packages",
        headers: [...PACKAGE_HEADERS, "Dimension"],
        rows: [
          [1, "Good", "DD - Detailed Design", "Roads & Highways", "Network", "In Progress", "2026-12-01", 20, "4D"],
        ],
      },
    ]);
    const s = await importHubWorkbook(a, { name: "lists.xlsx", buffer }, false);
    // Project Status is required and strict: the row is skipped, never stored with a wrong value.
    expect(has(s.warnings, '"Nearly done" is not one of')).toBe(true);
    expect(has(s.warnings, "row skipped")).toBe(true);
    const rows = await listRows(a, "projects", {});
    expect(rows.map((r) => r.name)).toEqual(["Good"]);

    // Dimension is strict but optional: the cell is cleared and the row kept, with a warning.
    expect(has(s.warnings, '"4D" is not one of')).toBe(true);
    const [pkg] = await listRows(a, "packages", {});
    expect(pkg!.description).toBe("Network");
    expect(pkg!.dimension).toBeNull();
  });

  it("warns about a typed date and never guesses it", async () => {
    const a = await admin();
    const buffer = await workbook([
      { name: "Projects", headers: PROJECT_HEADERS, rows: [[1, "Dates", "C", "DD - Detailed Design", "Progressing", "Ahmed"]] },
      {
        name: "Packages",
        headers: PACKAGE_HEADERS,
        rows: [
          [1, "Dates", "DD - Detailed Design", "Roads & Highways", "Network", "In Progress", "next Tuesday", 20],
          [2, "Dates", "DD - Detailed Design", "Roads & Highways", "Second", "In Progress", "2026-12-01", 30],
        ],
      },
    ]);
    const s = await importHubWorkbook(a, { name: "dates.xlsx", buffer }, false);
    expect(has(s.warnings, /Planned Submission .*is not a date/)).toBe(true);
    const pkgs = await listRows(a, "packages", {});
    expect(pkgs.find((p) => p.description === "Network")!.plannedSubmission).toBeNull();
    expect(pkgs.find((p) => p.description === "Second")!.plannedSubmission).toBe("2026-12-01");
  });

  it("creates a project a child sheet names but the Projects sheet does not, and says so", async () => {
    const a = await admin();
    const buffer = await workbook([
      { name: "Projects", headers: PROJECT_HEADERS, rows: [[1, "Listed", "C", "DD - Detailed Design", "Progressing", "Ahmed"]] },
      {
        name: "Packages",
        headers: PACKAGE_HEADERS,
        rows: [[1, "Renamed project", "DD - Detailed Design", "Roads & Highways", "Network", "In Progress", "2026-12-01", 10]],
      },
    ]);
    const s = await importHubWorkbook(a, { name: "renamed.xlsx", buffer }, false);
    expect(has(s.warnings, 'Project "Renamed project" is not on the Projects sheet')).toBe(true);
    const projects = await listRows(a, "projects", {});
    expect(projects.map((p) => p.name).sort()).toEqual(["Listed", "Renamed project"]);
    expect(projects.find((p) => p.name === "Renamed project")!.status).toBe("Not Started");
  });

  it("reports a sheet it cannot find, a sheet it does not read and a column it does not use", async () => {
    const a = await admin();
    const buffer = await workbook([
      {
        name: "Projects",
        headers: [...PROJECT_HEADERS, "Something Extra"],
        rows: [[1, "Only sheet", "C", "DD - Detailed Design", "Progressing", "Ahmed", "ignored"]],
      },
      { name: "Team notes", headers: ["Note"], rows: [["free text"]] },
    ]);
    const s = await importHubWorkbook(a, { name: "sheets.xlsx", buffer }, false);
    expect(has(s.warnings, "Lists sheet not found")).toBe(true);
    expect(has(s.warnings, /Sheets? the Hub does not read/)).toBe(true);
    expect(has(s.warnings, "columns the Hub does not use were ignored: something extra")).toBe(true);
    // A register whose sheet is missing is reported, and the rest still imports.
    const packages = s.registers.find((r) => r.key === "packages")!;
    expect(packages.found).toBe(false);
    expect(packages.inserted).toBe(0);
    expect((await listRows(a, "projects", {})).length).toBe(1);
  });

  it("refuses a file that is not a workbook, with a message a user can act on", async () => {
    const a = await admin();
    await expect(
      importHubWorkbook(a, { name: "notes.txt", buffer: Buffer.from("Project Name, Status\nAlpha, Progressing\n") }, true),
    ).rejects.toThrow(/workbook|\.xlsx/i);
  });

  it("changes nothing in a dry run, then imports the same file idempotently", async () => {
    const a = await admin();
    const buffer = await workbook([
      {
        name: "Projects",
        headers: PROJECT_HEADERS,
        rows: [
          [1, "Dry one", "C", "DD - Detailed Design", "Progressing", "Ahmed"],
          [2, "Dry two", "C", "DD - Detailed Design", "At Risk", "Ahmed"],
        ],
      },
    ]);
    const dry = await importHubWorkbook(a, { name: "dry.xlsx", buffer }, true);
    expect(dry.dryRun).toBe(true);
    expect(dry.registers.find((r) => r.key === "projects")!.rows).toBe(2);
    expect((await listRows(a, "projects", {})).length).toBe(0);

    const first = await importHubWorkbook(a, { name: "dry.xlsx", buffer }, false);
    expect(first.registers.find((r) => r.key === "projects")!.inserted).toBe(2);
    const second = await importHubWorkbook(a, { name: "dry.xlsx", buffer }, false);
    const again = second.registers.find((r) => r.key === "projects")!;
    expect(again.inserted).toBe(0);
    expect(again.updated).toBe(2);
    expect((await listRows(a, "projects", {})).length).toBe(2);
  });
});
