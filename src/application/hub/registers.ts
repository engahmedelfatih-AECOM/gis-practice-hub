import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNull, max, or, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { z } from "zod";
import {
  REGISTERS,
  flattenRow,
  rowSchema,
  splitJson,
  type FieldDef,
  type RegisterDef,
  type RegisterKey,
} from "@/domain/hub/registers";
import { uuidSchema } from "@/domain/shared/schema";
import type { ListKey } from "@/domain/shared/enums";
import { DEFAULT_WORKFLOW_STEPS } from "@/domain/hub/seed-lists";
import { can } from "@/domain/authz/policy";
import { db, type Tx } from "@/infrastructure/db/client";
import {
  innovationItem,
  pkg,
  project,
  qaqcChecklist,
  resourceRow,
  rfi,
  risk,
  schemaFeature,
  standardItem,
  updateItem,
  workflowStep,
} from "@/infrastructure/db/schema";
import type { Actor } from "@/application/auth/actor";
import { inScope, regionRefOf, scopeOf } from "@/application/authz/scope";
import { writeAudit } from "@/application/audit/audit";
import { forbidden, notFound, validation } from "@/application/errors";
import { assertCan, parseInput } from "@/application/shared/guard";
import { updateVersioned, withTx } from "@/application/shared/service";
import { listValues } from "./lists";

type RegisterTable = PgTable & {
  id: PgColumn;
  version: PgColumn;
  sortOrder: PgColumn;
  createdAt: PgColumn;
};

const TABLES: Record<RegisterKey, RegisterTable> = {
  projects: project as unknown as RegisterTable,
  packages: pkg as unknown as RegisterTable,
  schema: schemaFeature as unknown as RegisterTable,
  resources: resourceRow as unknown as RegisterTable,
  updates: updateItem as unknown as RegisterTable,
  risks: risk as unknown as RegisterTable,
  rfis: rfi as unknown as RegisterTable,
  qaqc: qaqcChecklist as unknown as RegisterTable,
  standards: standardItem as unknown as RegisterTable,
  innovation: innovationItem as unknown as RegisterTable,
};

export const ENTITY_TYPE: Record<RegisterKey, string> = {
  projects: "project",
  packages: "package",
  schema: "schema_feature",
  resources: "resource_row",
  updates: "update_item",
  risks: "risk",
  rfis: "rfi",
  qaqc: "qaqc_checklist",
  standards: "standard_item",
  innovation: "innovation_item",
};

/** A register row as the screens see it: flat (jsonb sub-fields lifted) with the project name. */
export type RegisterRow = Record<string, unknown> & {
  id: string;
  version: number;
  sortOrder: number;
  projectId?: string | null;
  projectName?: string | null;
};

export interface RegisterFilter {
  projectId?: string | null;
  q?: string | null;
  status?: string | null;
  /** Page size; a register page asks for one page at a time. Without it, every row is returned. */
  limit?: number;
  offset?: number;
}

/** Rows per page of a register table. */
export const PAGE_SIZE = 100;

function hasProject(def: RegisterDef): boolean {
  return def.fields.some((f) => f.type === "project");
}

/**
 * Rows of a register in sheet order, optionally filtered by project, status or text.
 * A region-scoped actor sees the rows of their own projects, plus rows that belong to no project.
 * `limit` and `offset` page the read; without a limit the caller gets the whole register.
 */
export async function listRows(actor: Actor, key: RegisterKey, filter: RegisterFilter = {}): Promise<RegisterRow[]> {
  assertCan(actor, "hub:read");
  const def = REGISTERS[key];
  const table = TABLES[key];
  const cols = table as unknown as Record<string, PgColumn>;
  const conds: SQL[] = [];
  if (filter.projectId && hasProject(def)) conds.push(eq(cols.projectId!, filter.projectId));
  if (hasProject(def)) {
    const scope = await scopeOf(actor, "hub:read");
    if (!scope.all) {
      conds.push(
        scope.projectIds.length
          ? or(inArray(cols.projectId!, scope.projectIds), isNull(cols.projectId!))!
          : isNull(cols.projectId!),
      );
    }
  } else if (key === "projects") {
    // The Projects register has no projectId column: each row is a project, so the scope is
    // applied to its own id (report 2026-11-02, B2).
    const scope = await scopeOf(actor, "hub:read");
    if (!scope.all) {
      conds.push(scope.projectIds.length ? inArray(cols.id!, scope.projectIds) : sql`false`);
    }
  }
  if (filter.status && cols.status) conds.push(eq(cols.status, filter.status));
  if (filter.q?.trim()) {
    const pattern = `%${filter.q.trim().replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    const textCols = def.fields.filter((f) => !f.json && (f.type === "text" || f.type === "textarea" || f.type === "select")).map((f) => cols[f.key]!);
    if (textCols.length) conds.push(or(...textCols.map((c) => ilike(c, pattern)))!);
  }
  const where = conds.length ? and(...conds) : undefined;
  // No silent cap: without a limit the caller (export, feed) asks for the whole register.
  const limit = filter.limit ?? Number.MAX_SAFE_INTEGER;
  const offset = filter.offset ?? 0;
  const rows = hasProject(def)
    ? await db
        .select({ row: table, projectName: project.name })
        .from(table)
        .leftJoin(project, eq(project.id, cols.projectId!))
        .where(where)
        .orderBy(asc(table.sortOrder), asc(table.createdAt))
        .limit(limit)
        .offset(offset)
    : (
        await db.select().from(table).where(where).orderBy(asc(table.sortOrder), asc(table.createdAt)).limit(limit).offset(offset)
      ).map((row) => ({ row, projectName: null as string | null }));
  return rows.map(({ row, projectName }) => ({
    ...(flattenRow(def, row as Record<string, unknown>) as RegisterRow),
    projectName,
  }));
}

/** Number of rows behind the current filter (the page footer of a register). */
export async function countRows(actor: Actor, key: RegisterKey, filter: RegisterFilter = {}): Promise<number> {
  const rows = await listRows(actor, key, { ...filter, limit: undefined, offset: 0 });
  return rows.length;
}

export async function getRow(actor: Actor, key: RegisterKey, id: string): Promise<RegisterRow> {
  assertCan(actor, "hub:read");
  const def = REGISTERS[key];
  const table = TABLES[key];
  const [row] = await db.select().from(table).where(eq(table.id, parseInput(uuidSchema, id))).limit(1);
  if (!row) throw notFound(def.label);
  const flat = flattenRow(def, row as Record<string, unknown>) as RegisterRow;
  const scope = await scopeOf(actor, "hub:read");
  // A row of the Projects register is the project itself: it has no projectId column, so the
  // scope is checked against its own id (otherwise it would look practice-wide).
  const scopeProjectId = key === "projects" ? (flat.id as string) : (flat.projectId as string | null);
  if (!inScope(scope, scopeProjectId)) {
    throw forbidden(`see this row of ${def.label} (your access covers ${scope.regionValues.join(", ") || "no region"})`);
  }
  if (flat.projectId) {
    const [p] = await db.select({ name: project.name }).from(project).where(eq(project.id, flat.projectId as string));
    flat.projectName = p?.name ?? null;
  }
  return flat;
}

/** Distinct names of the Resources sheet: the source of every person dropdown. */
export async function peopleNames(): Promise<string[]> {
  const rows = await db.selectDistinct({ name: resourceRow.name }).from(resourceRow).orderBy(asc(resourceRow.name));
  return rows.map((r) => r.name);
}

/** Dropdown sources a register form needs: list values per list key, people, projects. */
export async function formSources(def: RegisterDef) {
  const keys = Array.from(new Set(def.fields.map((f) => f.list).filter((k): k is ListKey => Boolean(k))));
  const lists: Partial<Record<ListKey, string[]>> = {};
  await Promise.all(
    keys.map(async (k) => {
      lists[k] = (await listValues(k)).map((v) => v.value);
    }),
  );
  const [people, projects] = await Promise.all([
    def.fields.some((f) => f.people) ? peopleNames() : Promise.resolve([]),
    hasProject(def) || def.key === "schema"
      ? db.select({ id: project.id, name: project.name }).from(project).orderBy(asc(project.sortOrder), asc(project.name))
      : Promise.resolve([] as { id: string; name: string }[]),
  ]);
  return { lists, people, projects };
}

async function validateStrict(def: RegisterDef, flat: Record<string, unknown>): Promise<void> {
  const errors: Record<string, string[]> = {};
  for (const f of def.fields) {
    if (!f.strict) continue;
    const v = flat[f.key];
    if (v === null || v === undefined || v === "") continue;
    const allowed = f.options ? [...f.options] : f.list ? (await listValues(f.list)).map((x) => x.value) : null;
    if (allowed && !allowed.includes(String(v))) errors[f.key] = [`Pick a value from the list: ${allowed.join(", ")}.`];
  }
  if (Object.keys(errors).length) throw validation("Please correct the highlighted fields.", errors);
}

/**
 * May this actor edit this row, and how far? "full" covers every column, "progress" only the
 * columns a GIS Specialist owns (GIS start, progress, remarks and the status up to Internal
 * QA/QC). A region-scoped grant is checked against the hubs of the row's project.
 */
async function assertManage(actor: Actor, def: RegisterDef, projectId?: string | null): Promise<"full" | "progress"> {
  const ref = await regionRefOf(projectId);
  if (def.plan && can(actor, def.plan, ref)) return "full";
  if (can(actor, def.manage, ref)) return def.plan ? "progress" : "full";
  const scope = await scopeOf(actor, def.plan ?? def.manage);
  if (!scope.all && projectId && !inScope(scope, projectId)) {
    throw forbidden(`change this project (your access covers ${scope.regionValues.join(", ") || "no region"})`);
  }
  throw forbidden(`edit ${def.label}`);
}

const PROGRESS_KEYS = (def: RegisterDef) => new Set(def.fields.filter((f) => f.progress).map((f) => f.key));

/**
 * Statuses a progress-level editor (GIS Specialist) may set on a package. GIS-STD-001 3.3 gives
 * the specialist the work up to the internal QA/QC; submitting to the client and everything after
 * it belongs to the GIS Lead or the GIS Manager.
 */
export const PROGRESS_STATUSES = ["Not Started", "In Progress", "Internal QA/QC"] as const;

/** Create a row at the end of the register. */
export async function createRow(actor: Actor, key: RegisterKey, raw: unknown): Promise<{ id: string }> {
  const def = REGISTERS[key];
  const draft = parseInput(rowSchema(def), raw) as Record<string, unknown>;
  const level = await assertManage(actor, def, draft.projectId as string | null);
  if (level === "progress") throw forbidden(`add rows to ${def.label}`);
  const flat = draft;
  await validateStrict(def, flat);
  const table = TABLES[key];
  return withTx(async (tx) => {
    const [m] = await tx.select({ n: max(table.sortOrder) }).from(table);
    const values = { ...splitJson(def, flat), sortOrder: ((m?.n as number | null) ?? 0) + 1 };
    const [row] = await tx.insert(table).values(values as never).returning();
    const inserted = row as RegisterRow;
    if (key === "projects") await createDefaultWorkflow(tx, inserted.id);
    await writeAudit(tx, actor, { action: `${ENTITY_TYPE[key]}.create`, entityType: ENTITY_TYPE[key], entityId: inserted.id, after: inserted });
    return { id: inserted.id };
  });
}

/** Update a row (optimistic locking on `version`). Specialists on Packages may change progress columns only. */
export async function updateRow(actor: Actor, key: RegisterKey, raw: unknown): Promise<void> {
  const def = REGISTERS[key];
  const head = parseInput(z.object({ id: uuidSchema, version: z.coerce.number().int().min(1) }), raw);
  const flat = parseInput(rowSchema(def), raw) as Record<string, unknown>;
  const table = TABLES[key];
  const [target] = await db.select().from(table).where(eq(table.id, head.id)).limit(1);
  if (!target) throw notFound(def.label);
  // On the Projects register the row is the project, so the region of a write is its own id.
  const writeProjectId =
    key === "projects" ? (target as RegisterRow).id : ((target as RegisterRow).projectId ?? (flat.projectId as string | null));
  const level = await assertManage(actor, def, writeProjectId);
  await validateStrict(def, flat);
  await withTx(async (tx) => {
    const [existing] = await tx.select().from(table).where(eq(table.id, head.id)).limit(1);
    if (!existing) throw notFound(def.label);
    const before = flattenRow(def, existing as Record<string, unknown>);
    let values = splitJson(def, flat);
    if (level === "progress") {
      const allowed = PROGRESS_KEYS(def);
      const changed = def.fields.filter((f) => !f.json && !allowed.has(f.key) && String(before[f.key] ?? "") !== String(flat[f.key] ?? ""));
      if (changed.length)
        throw forbidden(`change ${changed.map((f) => f.label).join(", ")} (a GIS Lead or the GIS Manager plans the package)`);
      const status = flat.status as string | null;
      if (status && !PROGRESS_STATUSES.includes(status as (typeof PROGRESS_STATUSES)[number]) && status !== before.status) {
        throw forbidden(
          `set the status to ${status} (a GIS Specialist works up to ${PROGRESS_STATUSES[PROGRESS_STATUSES.length - 1]}; the GIS Lead submits to the client)`,
        );
      }
      values = Object.fromEntries(Object.entries(values).filter(([k]) => allowed.has(k)));
    }
    const after = await updateVersioned(tx, table as never, head.id, head.version, values, def.label);
    await writeAudit(tx, actor, { action: `${ENTITY_TYPE[key]}.update`, entityType: ENTITY_TYPE[key], entityId: head.id, before: existing, after });
  });
}

export async function deleteRow(actor: Actor, key: RegisterKey, rawId: unknown): Promise<void> {
  const def = REGISTERS[key];
  const id = parseInput(uuidSchema, rawId);
  const table = TABLES[key];
  const [target] = await db.select().from(table).where(eq(table.id, id)).limit(1);
  if (!target) throw notFound(def.label);
  const delProjectId = key === "projects" ? (target as RegisterRow).id : (target as RegisterRow).projectId;
  if ((await assertManage(actor, def, delProjectId)) === "progress") throw forbidden(`delete rows of ${def.label}`);
  await withTx(async (tx) => {
    const [existing] = await tx.select().from(table).where(eq(table.id, id)).limit(1);
    if (!existing) throw notFound(def.label);
    await tx.delete(table).where(eq(table.id, id));
    await writeAudit(tx, actor, { action: `${ENTITY_TYPE[key]}.delete`, entityType: ENTITY_TYPE[key], entityId: id, before: existing });
  });
}

/** Every new project gets the default AECOM delivery workflow (editable on its update page). */
export async function createDefaultWorkflow(tx: Tx, projectId: string): Promise<void> {
  await tx
    .insert(workflowStep)
    .values(DEFAULT_WORKFLOW_STEPS.map((name, i) => ({ projectId, stepNo: i + 1, name, status: "Not Started" })))
    .onConflictDoNothing();
}

/** Field definitions a form may show to this actor (progress-only editors see the plan columns read-only). */
export function editableFields(
  actor: Actor,
  def: RegisterDef,
): { fields: FieldDef[]; readOnly: Set<string>; options: Record<string, readonly string[]> } {
  const readOnly = new Set<string>();
  const options: Record<string, readonly string[]> = {};
  if (def.plan && !can(actor, def.plan)) {
    for (const f of def.fields) if (!f.progress) readOnly.add(f.key);
    // The specialist's status choices stop at the internal QA/QC (GIS-STD-001 3.3).
    if (def.fields.some((f) => f.key === "status" && f.progress)) options.status = PROGRESS_STATUSES;
  }
  return { fields: def.fields, readOnly, options };
}

/** Move a row up or down inside its register (sheet order). */
export async function moveRow(actor: Actor, key: RegisterKey, rawId: unknown, direction: "up" | "down"): Promise<void> {
  const def = REGISTERS[key];
  const id = parseInput(uuidSchema, rawId);
  const table = TABLES[key];
  const [target] = await db.select().from(table).where(eq(table.id, id)).limit(1);
  if (!target) throw notFound(def.label);
  if ((await assertManage(actor, def, (target as RegisterRow).projectId)) === "progress") throw forbidden(`reorder ${def.label}`);
  await withTx(async (tx) => {
    const [row] = await tx.select().from(table).where(eq(table.id, id)).limit(1);
    if (!row) throw notFound(def.label);
    const current = (row as RegisterRow).sortOrder;
    const [neighbour] = await tx
      .select()
      .from(table)
      .where(direction === "up" ? sql`${table.sortOrder} < ${current}` : sql`${table.sortOrder} > ${current}`)
      .orderBy(direction === "up" ? desc(table.sortOrder) : asc(table.sortOrder))
      .limit(1);
    if (!neighbour) return;
    const n = neighbour as RegisterRow;
    await tx.update(table).set({ sortOrder: n.sortOrder } as never).where(eq(table.id, id));
    await tx.update(table).set({ sortOrder: current } as never).where(eq(table.id, n.id));
  });
}

/**
 * Set the Project Number of several projects in one save (the one-off screen that fills the
 * number for the projects already in the Hub). Input: `number:<project id>` to the typed value.
 * Only changed rows are written; an empty value clears the number. The number is unique.
 */
export async function setProjectNumbers(actor: Actor, raw: Record<string, unknown>): Promise<number> {
  const entries: { id: string; number: string | null }[] = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith("number:")) continue;
    const id = parseInput(uuidSchema, key.slice("number:".length));
    const number = parseInput(z.string().trim().max(60), typeof value === "string" ? value : "");
    entries.push({ id, number: number || null });
  }
  const seen = new Map<string, string>();
  for (const e of entries) {
    if (!e.number) continue;
    const k = e.number.toLowerCase();
    if (seen.has(k)) throw validation(`Project Number ${e.number} is typed on two projects. Each number belongs to one project.`);
    seen.set(k, e.id);
  }
  // Checked before the transaction: the region lookup reads outside it.
  for (const e of entries) await assertManage(actor, REGISTERS.projects, e.id);
  return withTx(async (tx) => {
    const changes = [];
    for (const e of entries) {
      const [before] = await tx.select().from(project).where(eq(project.id, e.id)).limit(1);
      if (!before) throw notFound("Project");
      if ((before.projectNumber ?? null) !== e.number) changes.push({ ...e, before });
    }
    // Clear first, then set: two projects can swap their numbers in one save.
    for (const c of changes) {
      if (c.before.projectNumber) await tx.update(project).set({ projectNumber: null }).where(eq(project.id, c.id));
    }
    for (const c of changes) {
      const [after] = await tx
        .update(project)
        .set({ projectNumber: c.number, version: sql`${project.version} + 1` })
        .where(eq(project.id, c.id))
        .returning();
      await writeAudit(tx, actor, { action: "project.update", entityType: "project", entityId: c.id, before: c.before, after });
    }
    return changes.length;
  });
}
