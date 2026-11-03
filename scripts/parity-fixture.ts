import "dotenv/config";
import { writeFileSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";

/**
 * Build the workbook parity fixture from the sample workbook.
 *
 * The workbook is the specification, so the test suite compares the Hub's own calculations with
 * the numbers Excel last calculated and stored in the file (the cached formula results). This
 * script collects those cached values into tests/fixtures/workbook-parity.json; the integration
 * test reads the fixture and never opens Excel itself.
 *
 * A cell whose cached result the file does not carry (a formula saved by a tool that does not
 * calculate, or a shared formula) is left out: a missing number cannot be compared, and guessing
 * one would make the test agree with itself rather than with the workbook.
 *
 *   npx tsx scripts/parity-fixture.ts [path to the workbook]
 */

const DEFAULT_FILE = "tests/fixtures/GIS_Practice_Hub_sample.xlsx";
const OUT = "tests/fixtures/workbook-parity.json";

/** Dashboard cells of the tile row and the two count tables. */
const DASHBOARD_CELLS: Record<string, string> = {
  totalProjects: "B6",
  activeProjects: "D6",
  notStarted: "E6",
  atRisk: "F6",
  submissionsThisPeriod: "G6",
  openClientComments: "B10",
  openRfis: "D10",
  teamUtilisation: "E10",
  openRisks: "F10",
  overdueRfis: "G10",
  periodStart: "N4",
  periodEnd: "N5",
};

/** Derived columns of a register sheet, by their header text on row 5. */
const DERIVED: { sheet: string; keyHeader: string; headers: string[] }[] = [
  {
    sheet: "Projects",
    keyHeader: "Project Name",
    headers: [
      "CRS Total",
      "RFI Open",
      "RFI Closed",
      "RFI Total",
      "GIS Delivered / Approved",
      "GIS In Progress",
      "Next Milestone",
      "Utilisation %",
      "Submissions This Period",
      "GIS Resources Region",
    ],
  },
  { sheet: "RFI Log", keyHeader: "Question / Information Requested", headers: ["RFI No.", "Overdue", "RAG"] },
  { sheet: "QAQC", keyHeader: "Project", headers: ["Score", "Result"] },
  { sheet: "Packages", keyHeader: "Package / Submission", headers: ["Days Overdue", "QA/QC Result"] },
];

type Cached = string | number | boolean | null;

function cached(cell: ExcelJS.Cell): Cached | undefined {
  const v = cell.value;
  if (v === null || v === undefined) return undefined;
  if (typeof v === "object") {
    if ("result" in v) {
      const r = (v as ExcelJS.CellFormulaValue).result;
      if (r === null || r === undefined) return undefined;
      if (r instanceof Date) return r.toISOString().slice(0, 10);
      if (typeof r === "object") return undefined; // an error value such as #N/A
      return r as Cached;
    }
    if ("richText" in v) return (v as ExcelJS.CellRichTextValue).richText.map((t) => t.text).join("");
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return undefined;
  }
  if (typeof v === "string") return v.trim();
  return v as Cached;
}

function headerMap(ws: ExcelJS.Worksheet, row: number): Map<string, number> {
  const map = new Map<string, number>();
  ws.getRow(row).eachCell({ includeEmpty: false }, (cell, col) => {
    const text = String(cached(cell) ?? "").replace(/\s+/g, " ").trim();
    if (text && !map.has(text)) map.set(text, col);
  });
  return map;
}

async function main() {
  const file = process.argv[2] ?? DEFAULT_FILE;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve(file));

  const out: {
    source: string;
    note: string;
    dashboard: Record<string, Cached>;
    rows: { sheet: string; key: string; values: Record<string, Cached> }[];
  } = {
    source: path.basename(file),
    note:
      "Cached Excel values of the sample workbook. Only cells the file carries a calculated value for are listed. " +
      "Values that depend on TODAY() were calculated by Excel on 30-Oct-2026.",
    dashboard: {},
    rows: [],
  };

  const dash = wb.getWorksheet("Dashboard");
  if (dash) {
    for (const [name, address] of Object.entries(DASHBOARD_CELLS)) {
      const v = cached(dash.getCell(address));
      if (v !== undefined) out.dashboard[name] = v;
    }
  }

  for (const def of DERIVED) {
    const ws = wb.getWorksheet(def.sheet);
    if (!ws) continue;
    const headers = headerMap(ws, 5);
    const keyCol = headers.get(def.keyHeader);
    if (!keyCol) continue;
    for (let r = 6; r <= ws.rowCount; r++) {
      const key = cached(ws.getRow(r).getCell(keyCol));
      if (key === undefined || key === null || String(key).trim() === "") continue;
      const values: Record<string, Cached> = {};
      for (const h of def.headers) {
        const col = headers.get(h);
        if (!col) continue;
        const v = cached(ws.getRow(r).getCell(col));
        if (v !== undefined) values[h] = v;
      }
      if (Object.keys(values).length) out.rows.push({ sheet: def.sheet, key: String(key).trim(), values });
    }
  }

  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  const cells = Object.keys(out.dashboard).length + out.rows.reduce((n, r) => n + Object.keys(r.values).length, 0);
  console.log(`${OUT}: ${cells} cached values (${Object.keys(out.dashboard).length} dashboard, ${out.rows.length} rows)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
