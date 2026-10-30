import "server-only";
import ExcelJS from "exceljs";
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

function cellValue(c: ExcelJS.Cell | undefined): Cell {
  if (!c) return null;
  let v: unknown = c.value;
  if (v && typeof v === "object") {
    if ("result" in v) v = (v as { result: unknown }).result;
    else if ("richText" in v) v = (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("");
    else if ("text" in v) v = (v as { text: string }).text;
    else if ("hyperlink" in v) v = (v as { hyperlink: string }).hyperlink;
    else if ("error" in v) v = null;
  }
  if (v === undefined || v === null) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number" || typeof v === "boolean") return v;
  const s = String(v).trim();
  return s === "" ? null : s;
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
  if (raw === null) return f.type === "int" || f.type === "pct" ? 0 : null;
  switch (f.type) {
    case "date": {
      const d = asIso(raw);
      if (!d) warnings.push(`${where}: "${asText(raw)}" is not a date for ${f.label}; left empty.`);
      return d;
    }
    case "number":
      return typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.-]/g, "")) || null;
    case "int":
      return typeof raw === "number" ? Math.round(raw) : Math.round(Number(String(raw).replace(/[^0-9.-]/g, "")) || 0);
    case "pct": {
      const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.-]/g, "")) || 0;
      return Math.max(0, Math.min(100, Math.round(n <= 1 ? n * 100 : n)));
    }
    case "project":
      return asText(raw);
    default:
      return asText(raw);
  }
}

function parseRegister(wb: ExcelJS.Workbook, def: RegisterDef, warnings: string[]): ParsedRegister {
  const ws = wb.getWorksheet(def.sheet);
  const out: ParsedRegister = { key: def.key, sheet: def.sheet, found: Boolean(ws), rows: [], warnings: [] };
  if (!ws) return out;
  const headers = headerMap(ws, 5);
  const cols = new Map<string, number>();
  for (const f of def.fields) {
    const col = headers.get(norm(f.label)) ?? headers.get(norm(f.label.replace(/\s*\(paste URL\)/i, "")));
    if (col) cols.set(f.key, col);
  }
  // Updates of the older workbook: "Report Period" text instead of Period From / To.
  const reportPeriodCol = def.key === "updates" ? headers.get("report period") : undefined;
  // Projects: the "Report Sheet" column names the update sheet (workflow and apps live there).
  const reportSheetCol = def.key === "projects" ? headers.get("report sheet") : undefined;
  for (let r = 6; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const flat: Record<string, unknown> = {};
    let hasValue = false;
    for (const f of def.fields) {
      const col = cols.get(f.key);
      const raw = col ? cellValue(row.getCell(col)) : null;
      if (raw !== null && raw !== "" && !(typeof raw === "number" && raw === 0 && (f.type === "int" || f.type === "pct"))) hasValue = true;
      flat[f.key] = parseField(f, raw, out.warnings, `${def.sheet} row ${r}`);
    }
    const name = flat[def.nameField];
    const projectRef = flat.projectId ?? flat.projectLabel;
    if (!hasValue) continue;
    if (!name && !projectRef) continue;
    if (def.key === "updates" && !flat.periodFrom && reportPeriodCol) {
      const txt = asText(cellValue(row.getCell(reportPeriodCol)));
      const m = txt?.match(/^(\d{2}-[A-Za-z]{3}-\d{4}) to (\d{2}-[A-Za-z]{3}-\d{4})$/);
      if (m) {
        flat.periodFrom = asIso(m[1]!);
        flat.periodTo = asIso(m[2]!);
      }
    }
    if (def.key === "updates" && !flat.periodFrom) {
      out.warnings.push(`Updates row ${r}: no period; row skipped.`);
      continue;
    }
    if (reportSheetCol) flat.__reportSheet = asText(cellValue(row.getCell(reportSheetCol)));
    out.rows.push(flat);
  }
  const missing = def.fields.filter((f) => !cols.has(f.key) && !["latitude", "longitude", "locationLabel", "periodFrom", "periodTo", "meetingDate"].includes(f.key));
  if (missing.length) warnings.push(`${def.sheet}: columns not found and left empty: ${missing.map((f) => f.label).join(", ")}.`);
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
  for (let r = 26; r <= 33; r++) {
    const name = asText(cellValue(ws.getRow(r).getCell(26)));
    if (!name || /^type here/i.test(name)) continue;
    apps.push({ name, url: asText(cellValue(ws.getRow(r).getCell(32))) });
  }
  return { steps, apps };
}

export async function parseHubWorkbook(buffer: ArrayBuffer | Buffer): Promise<ParsedWorkbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as never);
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
  return { registers, lists, periods, workflows, apps, warnings };
}

/* ------------------------------------------------------------------ applying */

export interface ImportSummary {
  dryRun: boolean;
  registers: { key: RegisterKey; sheet: string; found: boolean; rows: number; inserted: number; updated: number }[];
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

async function applyHub(tx: Tx, parsed: ParsedWorkbook, dryRun: boolean): Promise<ImportSummary> {
  const summary: ImportSummary = { dryRun, registers: [], lists: 0, periods: 0, workflows: 0, warnings: [...parsed.warnings] };

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
  let inserted = 0;
  let updated = 0;
  for (let i = 0; i < projectsParsed.rows.length; i++) {
    const flat = { ...projectsParsed.rows[i]! };
    delete flat.__reportSheet;
    const values = { ...splitJson(REGISTERS.projects, flat), sortOrder: i + 1 } as Record<string, unknown>;
    if (!values.status) values.status = "Not Started";
    const id = projectIdByName.get(norm(flat.name));
    if (id) {
      updated++;
      if (!dryRun) await tx.update(project).set(values as never).where(eq(project.id, id));
    } else {
      inserted++;
      if (!dryRun) {
        const [row] = await tx.insert(project).values(values as never).returning({ id: project.id });
        projectIdByName.set(norm(flat.name), row!.id);
        await createDefaultWorkflow(tx, row!.id);
      }
    }
  }
  summary.registers.push({ key: "projects", sheet: "Projects", found: projectsParsed.found, rows: projectsParsed.rows.length, inserted, updated });

  const ensureProject = async (name: string | null): Promise<string | null> => {
    if (!name) return null;
    const id = projectIdByName.get(norm(name));
    if (id) return id;
    summary.warnings.push(`Project "${name}" is not on the Projects sheet; it was created with status Not Started.`);
    if (dryRun) {
      projectIdByName.set(norm(name), `dry-${name}`);
      return `dry-${name}`;
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
    for (let i = 0; i < reg.rows.length; i++) {
      const flat = { ...reg.rows[i]! };
      if ("projectId" in flat) flat.projectId = await ensureProject(flat.projectId as string | null);
      if (reg.key === "schema") {
        const label = flat.projectLabel as string;
        flat.projectId = projectIdByName.get(norm(label)) ?? null;
        if (String(flat.projectId).startsWith("dry-")) flat.projectId = null;
      }
      const values = { ...splitJson(def, flat), sortOrder: i + 1 } as Record<string, unknown>;
      if (reg.key === "schema" && flat.projectId) values.projectId = flat.projectId;
      for (const f of def.fields) if (f.required && (values[f.key] === null || values[f.key] === undefined) && !f.json) values[f.key] = f.type === "select" ? "Not Started" : "-";
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
    summary.registers.push({ key: reg.key, sheet: reg.sheet, found: reg.found, rows: reg.rows.length, inserted: ins, updated: upd });
  }

  // Workflow steps and enterprise apps from the report sheets.
  for (const [name, steps] of parsed.workflows) {
    const id = projectIdByName.get(norm(name));
    if (!id || id.startsWith("dry-")) continue;
    summary.workflows++;
    if (dryRun) continue;
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

class DryRunRollback extends Error {
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
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(file.buffer as never);
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
