import "server-only";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { and, asc, eq, desc } from "drizzle-orm";
import { z } from "zod";
import { LIST_KEYS, LIST_KEY_VALUES, type ListKey } from "@/domain/shared/enums";
import { REGISTERS, REGISTER_KEYS, splitJson, type FieldDef, type RegisterDef, type RegisterKey } from "@/domain/hub/registers";
import { addDays } from "@/domain/hub/rules";
import { db, type Tx } from "@/infrastructure/db/client";
import {
  clientDomain,
  clientFeatureClass,
  clientField,
  clientSchema,
  clientSubtype,
  importRun,
  listItem,
  pkg,
  project,
  reportPeriod,
  workflowStep,
  enterpriseApp,
  innovationItem,
  qaqcChecklist,
  resourceRow,
  rfi,
  risk,
  schemaFeature,
  standardItem,
  updateItem,
} from "@/infrastructure/db/schema";
import type { Actor } from "@/application/auth/actor";
import { writeAudit } from "@/application/audit/audit";
import { validation } from "@/application/errors";
import { assertCan, parseInput } from "@/application/shared/guard";
import { withTx } from "@/application/shared/service";
import { createDefaultWorkflow } from "./registers";

/* ------------------------------------------------------------------ cell helpers */

type Cell = string | number | boolean | Date | null;

/**
 * The value of a cell as the team sees it in Excel: the cached result of a formula, the text of a
 * rich-text or hyperlink cell, and null for everything with no value (an empty cell, an error, or
 * a formula whose result the file does not carry). Never produces "[object Object]".
 */
function cellValue(c: ExcelJS.Cell | undefined): Cell {
  if (!c) return null;
  let v: unknown = c.value;
  for (let depth = 0; depth < 4 && v && typeof v === "object" && !(v instanceof Date); depth++) {
    if ("error" in v) v = null;
    else if ("result" in v) v = (v as { result: unknown }).result;
    else if ("richText" in v) v = (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("");
    else if ("text" in v) v = (v as { text: string }).text;
    else if ("hyperlink" in v) v = (v as { hyperlink: string }).hyperlink;
    // A formula the file stores without a cached result has no value to import.
    else v = null;
  }
  if (v === undefined || v === null || typeof v === "object") return v instanceof Date ? v : null;
  if (typeof v === "number" || typeof v === "boolean") return v;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** Empty for the purpose of "does this sheet row exist": nothing, or the workbook's "-" placeholder. */
function isBlank(v: Cell): boolean {
  return v === null || (typeof v === "string" && (v === "" || v === "-"));
}

function asIso(v: Cell): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + v * 86_400_000).toISOString().slice(0, 10);
  }
  if (typeof v === "string") {
    const m = v.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (m) {
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const mi = months.indexOf(m[2]!.toLowerCase());
      if (mi >= 0) return `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  }
  return null;
}

function asText(v: Cell): string | null {
  if (v === null) return null;
  if (v instanceof Date) return asIso(v);
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
  return String(v);
}

function norm(s: unknown): string {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Headers of the workbook that the Hub calculates itself or that are helper columns of the sheet.
 * They are not reported as ignored columns, because nothing is lost by not reading them.
 */
const IGNORED_HEADERS = new Set(
  [
    "#",
    "cls",
    "key",
    "label",
    "mdate",
    "mkey",
    "stg",
    "pkey",
    "discipline group",
    "days overdue",
    "overdue",
    "score",
    "result",
    "crs total",
    "rfi open",
    "rfi closed",
    "rfi total",
    "gis delivered / approved",
    "gis in progress",
    "gis resources region",
    "next milestone",
    "next milestone date",
    "utilisation %",
    "bucket",
    "rag",
    "open",
    "submissions this period",
    "report sheet",
    "open report",
    "report period",
    "qa/qc result",
    "rfi no.",
    "india",
    "romania",
    "south africa",
    "dubai",
    "mix",
  ].map((h) => h.toLowerCase()),
);

function headerMap(ws: ExcelJS.Worksheet, row: number): Map<string, number> {
  const map = new Map<string, number>();
  ws.getRow(row).eachCell({ includeEmpty: false }, (cell, col) => {
    const key = norm(cellValue(cell));
    if (key && !map.has(key)) map.set(key, col);
  });
  return map;
}

/* ------------------------------------------------------------------ parsing */

export interface ParsedRegister {
  key: RegisterKey;
  sheet: string;
  found: boolean;
  rows: Record<string, unknown>[];
  warnings: string[];
  /** Sheet rows that carried data but were left out, with the reason (counted in the summary). */
  skipped: number;
  /** Field keys whose column was found on the sheet. A field without a column is never written. */
  columns: string[];
}

/** Project fields that exist only in the Hub; the import writes them only when the sheet has their column. */
const HUB_ONLY_PROJECT_FIELDS = ["projectNumber", "latitude", "longitude", "locationLabel"] as const;

/** At most this many warning lines are kept; the rest are summarised in one line. */
const MAX_WARNINGS = 200;

function addWarning(list: string[], line: string): void {
  if (list.length < MAX_WARNINGS) list.push(line);
  else if (list.length === MAX_WARNINGS) list.push("More warnings were found; fix these first and run the dry run again.");
}

export interface ParsedWorkbook {
  registers: ParsedRegister[];
  lists: { key: ListKey; values: { value: string; group: string | null }[] }[];
  periods: { startDate: string; endDate: string }[];
  workflows: Map<string, { name: string; status: string }[]>;
  apps: Map<string, { name: string; url: string | null }[]>;
  warnings: string[];
}

function parseField(f: FieldDef, raw: Cell, warnings: string[], where: string): unknown {
  if (raw === null) return f.type === "int" ? 0 : null;
  switch (f.type) {
    case "date": {
      const d = asIso(raw);
      if (!d)
        addWarning(
          warnings,
          `${where}: ${f.label} "${asText(raw)}" is not a date (use dd-mmm-yyyy, as in the workbook); left empty.`,
        );
      return d;
    }
    case "number":
      return typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.-]/g, "")) || null;
    case "int":
      return typeof raw === "number" ? Math.round(raw) : Math.round(Number(String(raw).replace(/[^0-9.-]/g, "")) || 0);
    case "pct": {
      // The workbook stores percentages as fractions (0.7 = 70 %); 0 to 1 is read as a fraction.
      const max = f.max ?? 100;
      const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.-]/g, ""));
      if (!Number.isFinite(n)) {
        addWarning(warnings, `${where}: ${f.label} "${asText(raw)}" is not a percentage; left empty.`);
        return null;
      }
      const pct = Math.round(n > 0 && n <= 1 ? n * 100 : n);
      if (pct < 0 || pct > max) {
        addWarning(warnings, `${where}: ${f.label} ${pct} % is outside 0 to ${max} %; left empty.`);
        return null;
      }
      return pct;
    }
    case "project":
      return asText(raw);
    default:
      return asText(raw);
  }
}

function parseRegister(wb: ExcelJS.Workbook, def: RegisterDef, warnings: string[]): ParsedRegister {
  const ws = wb.getWorksheet(def.sheet);
  const out: ParsedRegister = { key: def.key, sheet: def.sheet, found: Boolean(ws), rows: [], warnings: [], skipped: 0, columns: [] };
  if (!ws) return out;
  const headers = headerMap(ws, 5);
  const cols = new Map<string, number>();
  for (const f of def.fields) {
    const col = headers.get(norm(f.label)) ?? headers.get(norm(f.label.replace(/\s*\(paste URL\)/i, "")));
    if (col) cols.set(f.key, col);
  }
  out.columns = [...cols.keys()];
  // Updates of the older workbook: "Report Period" text instead of Period From / To.
  const reportPeriodCol = def.key === "updates" ? headers.get("report period") : undefined;
  // Projects: the "Report Sheet" column names the update sheet (workflow and apps live there).
  const reportSheetCol = def.key === "projects" ? headers.get("report sheet") : undefined;
  // Rows left out because their key cells are empty: one summary line per sheet, not one per row.
  const keyless: number[] = [];
  for (let r = 6; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const raws = new Map<string, Cell>();
    for (const f of def.fields) {
      const col = cols.get(f.key);
      raws.set(f.key, col ? cellValue(row.getCell(col)) : null);
    }
    // Does this sheet row exist? The workbook asks the same question in its own "#" column.
    const exists = def.rowKey.some((k) => !isBlank(raws.get(k) ?? null));
    if (!exists) {
      // A row with no key but with data in other cells is reported, never half-imported.
      if ([...raws.values()].some((v) => !isBlank(v))) {
        out.skipped++;
        keyless.push(r);
      }
      continue;
    }
    const flat: Record<string, unknown> = { __row: r };
    for (const f of def.fields) {
      flat[f.key] = parseField(f, raws.get(f.key) ?? null, out.warnings, `${def.sheet} row ${r}`);
    }
    if (def.key === "updates" && !flat.periodFrom && reportPeriodCol) {
      const txt = asText(cellValue(row.getCell(reportPeriodCol)));
      const m = txt?.match(/^(\d{2}-[A-Za-z]{3}-\d{4}) to (\d{2}-[A-Za-z]{3}-\d{4})$/);
      if (m) {
        flat.periodFrom = asIso(m[1]!);
        flat.periodTo = asIso(m[2]!);
      }
    }
    if (def.key === "updates" && !flat.periodFrom) {
      out.skipped++;
      addWarning(out.warnings, `Updates row ${r}: no period; row skipped.`);
      continue;
    }
    if (reportSheetCol) flat.__reportSheet = asText(cellValue(row.getCell(reportSheetCol)));
    out.rows.push(flat);
  }
  if (keyless.length) {
    const keyLabels = def.rowKey.map((k) => def.fields.find((f) => f.key === k)?.label ?? k).join(" and ");
    const range = keyless.length === 1 ? `row ${keyless[0]}` : `rows ${keyless[0]} to ${keyless[keyless.length - 1]}`;
    addWarning(
      out.warnings,
      `${def.sheet}: ${keyless.length} ${keyless.length === 1 ? "row" : "rows"} skipped because ${keyLabels} is empty (${range}); these are formula or filler rows of the sheet.`,
    );
  }
  const missing = def.fields.filter(
    (f) =>
      !f.derived &&
      !cols.has(f.key) &&
      !["latitude", "longitude", "locationLabel", "projectNumber", "periodFrom", "periodTo", "meetingDate"].includes(f.key),
  );
  if (missing.length) addWarning(warnings, `${def.sheet}: columns not found and left empty: ${missing.map((f) => f.label).join(", ")}.`);
  const extra = [...headers.keys()].filter((h) => ![...cols.keys()].some((k) => norm(def.fields.find((f) => f.key === k)?.label ?? "") === h));
  const ignored = extra.filter((h) => !IGNORED_HEADERS.has(h));
  if (ignored.length) addWarning(warnings, `${def.sheet}: columns the Hub does not use were ignored: ${ignored.join(", ")}.`);
  return out;
}

function parseLists(wb: ExcelJS.Workbook, warnings: string[]): { lists: ParsedWorkbook["lists"]; periods: ParsedWorkbook["periods"] } {
  const ws = wb.getWorksheet("Lists");
  const lists: ParsedWorkbook["lists"] = [];
  const periods: ParsedWorkbook["periods"] = [];
  if (!ws) {
    warnings.push("Lists sheet not found: existing lists kept.");
    return { lists, periods };
  }
  const labelToKey = new Map<string, ListKey[]>();
  for (const k of LIST_KEY_VALUES) {
    const label = norm(k === "availabilityFlag" ? "Availability" : LIST_KEYS[k]);
    labelToKey.set(label, [...(labelToKey.get(label) ?? []), k]);
  }
  const seen = new Map<string, number>();
  let disciplineCol: number | null = null;
  let groupCol: number | null = null;
  let startCol: number | null = null;
  let endCol: number | null = null;
  ws.getRow(5).eachCell({ includeEmpty: false }, (cell, col) => {
    const label = norm(cellValue(cell));
    if (label === "discipline group") groupCol = col;
    if (label.startsWith("period start")) startCol = col;
    if (label.startsWith("period end")) endCol = col;
    const keys = labelToKey.get(label);
    if (!keys) return;
    const n = seen.get(label) ?? 0;
    seen.set(label, n + 1);
    const key = keys[Math.min(n, keys.length - 1)]!;
    if (key === "discipline") disciplineCol = col;
    const values: { value: string; group: string | null }[] = [];
    for (let r = 6; r <= ws.rowCount; r++) {
      const v = asText(cellValue(ws.getRow(r).getCell(col)));
      if (!v) continue;
      values.push({ value: v, group: null });
    }
    lists.push({ key, values });
  });
  if (disciplineCol && groupCol) {
    const disc = lists.find((l) => l.key === "discipline");
    if (disc) {
      let i = 0;
      for (let r = 6; r <= ws.rowCount; r++) {
        const v = asText(cellValue(ws.getRow(r).getCell(disciplineCol)));
        if (!v) continue;
        disc.values[i]!.group = asText(cellValue(ws.getRow(r).getCell(groupCol)));
        i++;
      }
    }
  }
  if (startCol && endCol) {
    for (let r = 6; r <= ws.rowCount; r++) {
      const s = asIso(cellValue(ws.getRow(r).getCell(startCol)));
      const e = asIso(cellValue(ws.getRow(r).getCell(endCol))) ?? (s ? addDays(s, 13) : null);
      if (s && e) periods.push({ startDate: s, endDate: e });
    }
  }
  return { lists, periods };
}

/** Workflow steps (rows 41+, name in C, status in N) and enterprise apps (rows 26-27, Z and AF) of a report sheet. */
function parseReportSheet(ws: ExcelJS.Worksheet | undefined) {
  const steps: { name: string; status: string }[] = [];
  const apps: { name: string; url: string | null }[] = [];
  if (!ws) return { steps, apps };
  for (let r = 41; r <= Math.min(ws.rowCount, 70); r++) {
    const name = asText(cellValue(ws.getRow(r).getCell(3)));
    if (!name) continue;
    const status = asText(cellValue(ws.getRow(r).getCell(14))) ?? "Not Started";
    steps.push({ name, status: ["Completed", "In Progress", "Not Started"].includes(status) ? status : "Not Started" });
  }
  // The table starts on row 26 and ends at its "Type here..." hint row (row 28 until someone
  // inserts more app rows). The workflow strip starts right below it and must not be read as apps.
  for (let r = 26; r <= 40; r++) {
    const name = asText(cellValue(ws.getRow(r).getCell(26)));
    if (name && /^type here/i.test(name)) break;
    if (!name) continue;
    apps.push({ name, url: asText(cellValue(ws.getRow(r).getCell(32))) });
  }
  return { steps, apps };
}

/**
 * Pictures and charts of a workbook that was last saved by a tool other than Excel (openpyxl,
 * Google Sheets, LibreOffice) can carry drawing parts the reader cannot reconcile. Nothing the
 * Hub imports lives in a drawing, so a retry drops those parts and reads the data.
 */
async function withoutDrawings(buffer: ArrayBuffer | Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer as never);
  const drop = Object.keys(zip.files).filter((n) => /^xl\/(drawings|charts|media)\//.test(n));
  for (const name of drop) zip.remove(name);
  for (const name of Object.keys(zip.files)) {
    if (!/^xl\/(worksheets\/.*\.xml|worksheets\/_rels\/.*|_rels\/.*)$|^\[Content_Types\]\.xml$/.test(name)) continue;
    const xml = await zip.file(name)!.async("string");
    const clean = xml
      .replace(/<(?:\w+:)?(drawing|legacyDrawing|legacyDrawingHF|picture)\b[^>]*\/>/g, "")
      .replace(/<Relationship\b[^>]*(?:drawings|charts|media)\/[^>]*\/>/g, "")
      .replace(/<Override\b[^>]*PartName="\/xl\/(?:drawings|charts)\/[^>]*\/>/g, "");
    if (clean !== xml) zip.file(name, clean);
  }
  return zip.generateAsync({ type: "nodebuffer" });
}

async function loadWorkbook(buffer: ArrayBuffer | Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as never);
    return wb;
  } catch (first) {
    try {
      const retry = new ExcelJS.Workbook();
      await retry.xlsx.load((await withoutDrawings(buffer)) as never);
      return retry;
    } catch {
      throw validation(
        `This file could not be read as an Excel workbook (${first instanceof Error ? first.message : "unknown error"}). Open it in Excel, save it as .xlsx and upload it again.`,
      );
    }
  }
}

export async function parseHubWorkbook(buffer: ArrayBuffer | Buffer): Promise<ParsedWorkbook> {
  const wb = await loadWorkbook(buffer);
  const warnings: string[] = [];
  const registers = REGISTER_KEYS.map((k) => parseRegister(wb, REGISTERS[k], warnings));
  const { lists, periods } = parseLists(wb, warnings);
  const workflows = new Map<string, { name: string; status: string }[]>();
  const apps = new Map<string, { name: string; url: string | null }[]>();
  const projects = registers.find((r) => r.key === "projects")!;
  for (const p of projects.rows) {
    const sheetName = (p.__reportSheet as string | null) ?? (p.name as string);
    const parsed = parseReportSheet(wb.getWorksheet(sheetName) ?? wb.getWorksheet(String(p.name).slice(0, 31)));
    if (parsed.steps.length) workflows.set(p.name as string, parsed.steps);
    if (parsed.apps.length) apps.set(p.name as string, parsed.apps);
  }
  if (!projects.found) throw validation("This file has no Projects sheet. Upload the GIS_Practice_Hub workbook.");
  const known = new Set([...REGISTER_KEYS.map((k) => norm(REGISTERS[k].sheet)), norm("Lists")]);
  const reportSheets = new Set(projects.rows.map((p) => norm((p.__reportSheet as string | null) ?? (p.name as string))));
  const other = wb.worksheets
    .map((w) => w.name)
    .filter((n) => !known.has(norm(n)) && !reportSheets.has(norm(n)) && !/^(home|dashboard|delivery tracker|report template)$/i.test(n.trim()));
  if (other.length) addWarning(warnings, `Sheets the Hub does not read were ignored: ${other.join(", ")}.`);
  return { registers, lists, periods, workflows, apps, warnings };
}

/* ------------------------------------------------------------------ applying */

export interface ImportSummary {
  dryRun: boolean;
  registers: { key: RegisterKey; sheet: string; found: boolean; rows: number; inserted: number; updated: number; skipped: number }[];
  lists: number;
  periods: number;
  workflows: number;
  warnings: string[];
}

const TABLE_BY_KEY = {
  packages: pkg,
  schema: schemaFeature,
  resources: resourceRow,
  updates: updateItem,
  risks: risk,
  rfis: rfi,
  qaqc: qaqcChecklist,
  standards: standardItem,
  innovation: innovationItem,
} as const;

function keyOf(def: RegisterDef, row: Record<string, unknown>): string {
  return def.naturalKey.map((k) => norm(row[k])).join("|");
}

/**
 * Allowed values of every strict dropdown, from the lists of the workbook merged with the lists
 * already in the Hub. A strict dropdown is one the workbook itself refuses to type into
 * (showErrorMessage), so a value outside the list is an error in the file, not a new value.
 */
async function allowedValues(tx: Tx, parsed: ParsedWorkbook): Promise<Map<ListKey, Set<string>>> {
  const rows = await tx.select({ listKey: listItem.listKey, value: listItem.value }).from(listItem);
  const out = new Map<ListKey, Set<string>>();
  const add = (key: ListKey, value: string) => {
    const set = out.get(key) ?? new Set<string>();
    set.add(norm(value));
    out.set(key, set);
  };
  for (const r of rows) add(r.listKey as ListKey, r.value);
  for (const l of parsed.lists) for (const v of l.values) add(l.key, v.value);
  return out;
}

/**
 * Check the strict dropdowns of one row. A value outside the list is never stored: the cell is
 * left empty and a warning names it, and when the column is required the whole row is reported
 * and left out, so a wrong value can never hide inside a register.
 */
function checkStrict(
  def: RegisterDef,
  flat: Record<string, unknown>,
  allowed: Map<ListKey, Set<string>>,
  warnings: string[],
): { skip: boolean } {
  let skip = false;
  const where = `${def.sheet} row ${flat.__row}`;
  for (const f of def.fields) {
    if (!f.strict || f.derived) continue;
    const v = flat[f.key];
    if (v === null || v === undefined || v === "") continue;
    const list = f.options ? new Set(f.options.map((o) => norm(o))) : f.list ? allowed.get(f.list) : null;
    if (!list || !list.size) continue;
    if (list.has(norm(v))) continue;
    const shown = f.options ? [...f.options].join(", ") : "the list on the Lists sheet";
    if (f.required) {
      skip = true;
      addWarning(warnings, `${where}: ${f.label} "${String(v)}" is not one of ${shown}; row skipped.`);
    } else {
      flat[f.key] = null;
      addWarning(warnings, `${where}: ${f.label} "${String(v)}" is not one of ${shown}; left empty.`);
    }
  }
  return { skip };
}

async function applyHub(tx: Tx, parsed: ParsedWorkbook, dryRun: boolean): Promise<ImportSummary> {
  const summary: ImportSummary = { dryRun, registers: [], lists: 0, periods: 0, workflows: 0, warnings: [...parsed.warnings] };
  for (const reg of parsed.registers) for (const w of reg.warnings) addWarning(summary.warnings, w);

  // Lists: upsert values in sheet order, keep extra values already in the app.
  for (const l of parsed.lists) {
    const existing = await tx.select().from(listItem).where(eq(listItem.listKey, l.key));
    const byValue = new Map(existing.map((e) => [norm(e.value), e]));
    for (let i = 0; i < l.values.length; i++) {
      const v = l.values[i]!;
      const e = byValue.get(norm(v.value));
      if (e) {
        if (!dryRun) await tx.update(listItem).set({ sortOrder: i + 1, group: v.group ?? e.group, isActive: true }).where(eq(listItem.id, e.id));
      } else {
        summary.lists++;
        if (!dryRun) await tx.insert(listItem).values({ listKey: l.key, value: v.value, group: v.group, sortOrder: i + 1 });
      }
    }
  }
  // Periods: the workbook calendar replaces the app calendar when present.
  if (parsed.periods.length) {
    summary.periods = parsed.periods.length;
    if (!dryRun) {
      await tx.delete(reportPeriod);
      await tx.insert(reportPeriod).values(parsed.periods);
    }
  }

  // Projects first (other registers reference them by name).
  const projectsParsed = parsed.registers.find((r) => r.key === "projects")!;
  const existingProjects = await tx.select().from(project);
  const projectIdByName = new Map(existingProjects.map((p) => [norm(p.name), p.id]));
  const numberOwner = new Map(existingProjects.filter((p) => p.projectNumber).map((p) => [norm(p.projectNumber), norm(p.name)]));
  if (projectsParsed.found && !projectsParsed.columns.includes("projectNumber"))
    addWarning(summary.warnings, "Projects: no Project Number column on the sheet; the numbers kept in the Hub are unchanged.");
  const allowed = await allowedValues(tx, parsed);
  let inserted = 0;
  let updated = 0;
  let projectsSkipped = projectsParsed.skipped;
  for (let i = 0; i < projectsParsed.rows.length; i++) {
    const flat = { ...projectsParsed.rows[i]! };
    delete flat.__reportSheet;
    if (checkStrict(REGISTERS.projects, flat, allowed, summary.warnings).skip) {
      projectsSkipped++;
      continue;
    }
    const values = { ...splitJson(REGISTERS.projects, flat), sortOrder: i + 1 } as Record<string, unknown>;
    if (!values.status) values.status = "Not Started";
    // Fields the workbook does not carry (the map location, the Project Number) belong to the Hub:
    // a sheet without their column must not empty them.
    for (const k of HUB_ONLY_PROJECT_FIELDS) if (!projectsParsed.columns.includes(k)) delete values[k];
    // The Project Number is unique: a number met twice in the file, or already on another project,
    // is left out with a warning, so one typing slip does not stop the whole import.
    const number = typeof values.projectNumber === "string" ? values.projectNumber.trim() : "";
    if ("projectNumber" in values) {
      const owner = number ? numberOwner.get(norm(number)) : undefined;
      if (number && owner && owner !== norm(flat.name)) {
        addWarning(summary.warnings, `Projects row ${flat.__row}: Project Number ${number} is already used by another project; the number was left unchanged.`);
        delete values.projectNumber;
      } else {
        values.projectNumber = number || null;
        if (number) numberOwner.set(norm(number), norm(flat.name));
      }
    }
    delete values.__row;
    const id = projectIdByName.get(norm(flat.name));
    if (id) {
      updated++;
      if (!dryRun) await tx.update(project).set(values as never).where(eq(project.id, id));
    } else {
      inserted++;
      if (dryRun) {
        // The dry run must see the projects of the file, or every other sheet would look unmatched.
        projectIdByName.set(norm(flat.name), `dry-${norm(flat.name)}`);
      } else {
        const [row] = await tx.insert(project).values(values as never).returning({ id: project.id });
        projectIdByName.set(norm(flat.name), row!.id);
        await createDefaultWorkflow(tx, row!.id);
      }
    }
  }
  summary.registers.push({
    key: "projects",
    sheet: "Projects",
    found: projectsParsed.found,
    rows: projectsParsed.rows.length - (projectsSkipped - projectsParsed.skipped),
    inserted,
    updated,
    skipped: projectsSkipped,
  });
  // Projects in the Hub that the file does not mention are left untouched, but the team is told.
  const inFile = new Set(projectsParsed.rows.map((r) => norm(r.name)));
  const missingFromFile = existingProjects.filter((p) => !inFile.has(norm(p.name))).map((p) => p.name);
  if (missingFromFile.length)
    addWarning(
      summary.warnings,
      `In the Hub but not on the Projects sheet, so left unchanged (rename in the Hub, not in the file): ${missingFromFile.join(", ")}.`,
    );

  const ensureProject = async (name: string | null): Promise<string | null> => {
    if (!name) return null;
    const id = projectIdByName.get(norm(name));
    if (id) return id;
    addWarning(summary.warnings, `Project "${name}" is not on the Projects sheet; it was created with status Not Started.`);
    if (dryRun) {
      projectIdByName.set(norm(name), `dry-${norm(name)}`);
      return `dry-${norm(name)}`;
    }
    const [row] = await tx.insert(project).values({ name, status: "Not Started", sortOrder: projectIdByName.size + 1 }).returning({ id: project.id });
    projectIdByName.set(norm(name), row!.id);
    await createDefaultWorkflow(tx, row!.id);
    return row!.id;
  };

  for (const reg of parsed.registers) {
    if (reg.key === "projects") continue;
    const def = REGISTERS[reg.key];
    const table = TABLE_BY_KEY[reg.key as keyof typeof TABLE_BY_KEY];
    const existing = (await tx.select().from(table)) as Record<string, unknown>[];
    const byKey = new Map(existing.map((e) => [keyOf(def, e), e]));
    let ins = 0;
    let upd = 0;
    let skipped = reg.skipped;
    let position = 0;
    for (let i = 0; i < reg.rows.length; i++) {
      const flat = { ...reg.rows[i]! };
      if (checkStrict(def, flat, allowed, summary.warnings).skip) {
        skipped++;
        continue;
      }
      if ("projectId" in flat) flat.projectId = await ensureProject(flat.projectId as string | null);
      if (reg.key === "schema") {
        const label = flat.projectLabel as string;
        flat.projectId = projectIdByName.get(norm(label)) ?? null;
        if (String(flat.projectId).startsWith("dry-")) flat.projectId = null;
      }
      const values = { ...splitJson(def, flat), sortOrder: ++position } as Record<string, unknown>;
      if (reg.key === "schema" && flat.projectId) values.projectId = flat.projectId;
      // A required column the file leaves empty is filled with the workbook's own placeholder,
      // and the team is told which row and column, so nothing is corrected silently.
      for (const f of def.fields) {
        if (f.json || f.derived || !f.required) continue;
        if (values[f.key] !== null && values[f.key] !== undefined && values[f.key] !== "") continue;
        values[f.key] = f.type === "select" ? "Not Started" : "-";
        addWarning(
          summary.warnings,
          `${reg.sheet} row ${flat.__row}: ${f.label} is empty; imported as "${values[f.key]}".`,
        );
      }
      const k = keyOf(def, { ...flat, ...values });
      const e = byKey.get(k);
      if (e) {
        upd++;
        if (!dryRun) await tx.update(table).set(values as never).where(eq((table as unknown as { id: typeof project.id }).id, e.id as string));
      } else {
        ins++;
        if (!dryRun) await tx.insert(table).values(values as never);
      }
    }
    summary.registers.push({ key: reg.key, sheet: reg.sheet, found: reg.found, rows: position, inserted: ins, updated: upd, skipped });
  }

  // Workflow steps and enterprise apps from the report sheets.
  for (const [name, steps] of parsed.workflows) {
    const id = projectIdByName.get(norm(name));
    if (!id) continue;
    summary.workflows++;
    if (dryRun || id.startsWith("dry-")) continue;
    await tx.delete(workflowStep).where(eq(workflowStep.projectId, id));
    await tx.insert(workflowStep).values(steps.map((s, i) => ({ projectId: id, stepNo: i + 1, name: s.name, status: s.status })));
  }
  for (const [name, apps] of parsed.apps) {
    const id = projectIdByName.get(norm(name));
    if (!id || id.startsWith("dry-") || dryRun) continue;
    const existing = await tx.select().from(enterpriseApp).where(eq(enterpriseApp.projectId, id));
    const names = new Set(existing.map((a) => norm(a.name)));
    const fresh = apps.filter((a) => !names.has(norm(a.name)));
    if (fresh.length) await tx.insert(enterpriseApp).values(fresh.map((a, i) => ({ projectId: id, name: a.name, url: a.url, sortOrder: existing.length + i + 1 })));
  }
  return summary;
}

/** Import the GIS_Practice_Hub workbook (Administration > Import). Idempotent: rows are matched on their natural key. */
export async function importHubWorkbook(actor: Actor, file: { name: string; buffer: ArrayBuffer | Buffer }, dryRun: boolean): Promise<ImportSummary> {
  assertCan(actor, "import:run");
  const parsed = await parseHubWorkbook(file.buffer);
  return withTx(async (tx) => {
    const [run] = await tx.insert(importRun).values({ kind: "HUB_WORKBOOK", fileName: file.name, dryRun, startedBy: actor.userId }).returning();
    try {
      const summary = await applyHub(tx, parsed, dryRun);
      await tx.update(importRun).set({ status: "SUCCEEDED", finishedAt: new Date(), summary: summary as unknown as Record<string, unknown> }).where(eq(importRun.id, run!.id));
      await writeAudit(tx, actor, { action: dryRun ? "import.dryRun" : "import.apply", entityType: "import_run", entityId: run!.id, after: summary as unknown as Record<string, unknown> });
      if (dryRun) {
        // Keep the run record but roll back the data by throwing a sentinel after writing the summary.
        throw new DryRunRollback(summary);
      }
      return summary;
    } catch (err) {
      if (err instanceof DryRunRollback) throw err;
      await tx.update(importRun).set({ status: "FAILED", finishedAt: new Date(), error: err instanceof Error ? err.message : String(err) }).where(eq(importRun.id, run!.id));
      throw err;
    }
  }).catch(async (err) => {
    if (err instanceof DryRunRollback) {
      await db.insert(importRun).values({ kind: "HUB_WORKBOOK", fileName: file.name, dryRun: true, status: "SUCCEEDED", startedBy: actor.userId, finishedAt: new Date(), summary: err.summary as unknown as Record<string, unknown> });
      return err.summary;
    }
    throw err;
  });
}

/** Sentinel that rolls the dry run back after its summary is written. Expected, never logged. */
class DryRunRollback extends Error {
  readonly expected = true;
  constructor(readonly summary: ImportSummary) {
    super("dry run");
  }
}

/* ------------------------------------------------------------------ client schema (Master Tracker) */

export interface ClientSchemaSummary {
  clientName: string;
  featureClasses: number;
  fields: number;
  subtypes: number;
  domains: number;
  dryRun: boolean;
  warnings: string[];
}

function findHeaderRow(ws: ExcelJS.Worksheet, mustContain: string, maxRow = 12): number | null {
  for (let r = 1; r <= Math.min(maxRow, ws.rowCount); r++) {
    const labels: string[] = [];
    ws.getRow(r).eachCell({ includeEmpty: false }, (c) => labels.push(norm(cellValue(c))));
    if (labels.includes(norm(mustContain))) return r;
  }
  return null;
}

function readTable(ws: ExcelJS.Worksheet | undefined, mustContain: string): Record<string, Cell>[] {
  if (!ws) return [];
  const hr = findHeaderRow(ws, mustContain);
  if (!hr) return [];
  const headers = headerMap(ws, hr);
  const rows: Record<string, Cell>[] = [];
  for (let r = hr + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rec: Record<string, Cell> = {};
    let any = false;
    for (const [label, col] of headers) {
      const v = cellValue(row.getCell(col));
      if (v !== null && label !== "#") any = true;
      rec[label] = v;
    }
    if (any) rows.push(rec);
  }
  return rows;
}

const clientInput = z.object({ clientName: z.string().trim().min(1, "Client name is required.").max(120) });

/** Import a client Master Tracker workbook: feature classes, dictionary, subtypes and domains replace the client's schema. */
export async function importClientSchema(actor: Actor, raw: unknown, file: { name: string; buffer: ArrayBuffer | Buffer }, dryRun: boolean): Promise<ClientSchemaSummary> {
  assertCan(actor, "import:run");
  const input = parseInput(clientInput, raw);
  const wb = await loadWorkbook(file.buffer);
  const warnings: string[] = [];
  const master = readTable(wb.getWorksheet("Master Tracker"), "Feature Class");
  const dict = readTable(wb.getWorksheet("Dictionary"), "Field Name");
  const subs = readTable(wb.getWorksheet("Subtypes"), "Subtype Code");
  const doms = readTable(wb.getWorksheet("Domains"), "Domain Name");
  if (!master.length) throw validation("No Master Tracker sheet with a Feature Class column was found.");
  const t = (rec: Record<string, Cell>, label: string) => asText(rec[norm(label)] ?? null);
  const n = (rec: Record<string, Cell>, label: string) => {
    const v = rec[norm(label)];
    return typeof v === "number" ? Math.round(v) : v ? Math.round(Number(v)) || null : null;
  };
  const summary: ClientSchemaSummary = { clientName: input.clientName, featureClasses: master.length, fields: dict.length, subtypes: subs.length, domains: doms.length, dryRun, warnings };
  if (dryRun) return summary;
  await withTx(async (tx) => {
    const [existing] = await tx.select().from(clientSchema).where(eq(clientSchema.clientName, input.clientName));
    let schemaId = existing?.id;
    if (!schemaId) {
      const [row] = await tx.insert(clientSchema).values({ clientName: input.clientName }).returning({ id: clientSchema.id });
      schemaId = row!.id;
    } else {
      await tx.delete(clientFeatureClass).where(eq(clientFeatureClass.clientSchemaId, schemaId));
      await tx.delete(clientField).where(eq(clientField.clientSchemaId, schemaId));
      await tx.delete(clientSubtype).where(eq(clientSubtype.clientSchemaId, schemaId));
      await tx.delete(clientDomain).where(eq(clientDomain.clientSchemaId, schemaId));
    }
    const seen = new Set<string>();
    const fcs = master
      .filter((r) => t(r, "Feature Class"))
      .filter((r) => {
        const k = norm(t(r, "Feature Class"));
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    if (fcs.length)
      await tx.insert(clientFeatureClass).values(
        fcs.map((r, i) => ({
          clientSchemaId: schemaId!,
          sortOrder: i + 1,
          groupingAbbr: t(r, "Grouping Abbr"),
          groupingName: t(r, "Grouping Name"),
          featureClass: t(r, "Feature Class")!,
          featureClassAlias: t(r, "Feature Class Alias"),
          geometryType: t(r, "Geometry Type"),
          discipline: t(r, "Discipline"),
          disciplineIndividual: t(r, "Discipline Individual"),
          availability: t(r, "Available / Unavailable"),
          gisComments: t(r, "GIS Comments"),
          status: t(r, "Status"),
          notes: t(r, "Notes"),
          sourceFileUrl: t(r, "Source File Link (paste URL)") ?? t(r, "Source File Link"),
          shareFolderUrl: t(r, "Share Folder Link (paste URL)") ?? t(r, "Share Folder Link"),
        })),
      );
    const fields = dict.filter((r) => t(r, "Field Name") && t(r, "Feature Class"));
    for (let i = 0; i < fields.length; i += 500) {
      await tx.insert(clientField).values(
        fields.slice(i, i + 500).map((r, j) => ({
          clientSchemaId: schemaId!,
          sortOrder: i + j + 1,
          grouping: t(r, "Grouping"),
          featureClass: t(r, "Feature Class")!,
          geometryType: t(r, "Geometry Type"),
          fieldName: t(r, "Field Name")!,
          fieldAlias: t(r, "Field Alias"),
          description: t(r, "Description"),
          esriType: t(r, "ESRI Field Type"),
          textLength: n(r, "Text Max Length"),
          numericPrecision: n(r, "Numeric Precision"),
          numericScale: n(r, "Numeric Scale"),
          domainHint: t(r, "Domain Hint"),
          nullable: t(r, "Nullable"),
          defaultValue: t(r, "Default Value"),
          units: t(r, "Units"),
        })),
      );
    }
    const subtypes = subs.filter((r) => t(r, "Feature Class"));
    if (subtypes.length)
      await tx.insert(clientSubtype).values(
        subtypes.map((r, i) => ({ clientSchemaId: schemaId!, sortOrder: i + 1, featureClass: t(r, "Feature Class")!, code: t(r, "Subtype Code"), name: t(r, "Subtype Name") })),
      );
    const domains = doms.filter((r) => t(r, "Domain Name"));
    if (domains.length)
      await tx.insert(clientDomain).values(
        domains.map((r, i) => ({ clientSchemaId: schemaId!, sortOrder: i + 1, domainName: t(r, "Domain Name")!, domainType: t(r, "Domain Type"), domainValues: t(r, "Domain Values") })),
      );
    const [run] = await tx
      .insert(importRun)
      .values({ kind: "CLIENT_SCHEMA", fileName: file.name, dryRun: false, status: "SUCCEEDED", startedBy: actor.userId, finishedAt: new Date(), summary: summary as unknown as Record<string, unknown> })
      .returning();
    await writeAudit(tx, actor, { action: "import.clientSchema", entityType: "client_schema", entityId: schemaId, after: { run: run!.id, ...summary } });
  });
  return summary;
}

export async function listImportRuns(actor: Actor) {
  assertCan(actor, "import:run");
  return db.select().from(importRun).orderBy(desc(importRun.startedAt)).limit(20);
}

/** Remove every imported register row (keeps lists, periods, users and settings). Administrator only. */
export async function removeAllHubData(actor: Actor): Promise<void> {
  assertCan(actor, "import:run");
  await withTx(async (tx) => {
    for (const table of [updateItem, qaqcChecklist, rfi, risk, resourceRow, schemaFeature, pkg, standardItem, innovationItem, enterpriseApp, workflowStep, project]) {
      await tx.delete(table);
    }
    await writeAudit(tx, actor, { action: "import.removeAll", entityType: "import_run" });
  });
}

export const _test = { asIso, norm, parseReportSheet, and, asc };
