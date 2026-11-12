import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { REGISTERS, type FieldDef, type RegisterKey } from "@/domain/hub/registers";
import type { ListKey } from "@/domain/shared/enums";
import type { db } from "@/infrastructure/db/client";
import type { DeleteRule, UsagePart } from "@/application/shared/usage";

/**
 * What "in use" means for each record type of the Hub that a user can create, on top of the
 * foreign keys read from the catalogue (see application/shared/usage.ts), and which child rows
 * are owned parts of the record.
 *
 * Included: the ten registers, the Lists values and the Report periods.
 * Excluded: users (deactivate), API keys (revoke, the key row is the history), the audit log and
 * import runs (history), settings (not records), the client schema dictionaries (created and
 * replaced by the workbook import only) and the project update page parts (workflow steps and
 * enterprise applications), which keep their own remove buttons and go with their project.
 */

type Query = Pick<typeof db, "execute">;

/** Table and column names of the register tables, as the database names them. */
const TABLE: Record<RegisterKey, string> = {
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

const snake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** Column expression of a register field: a plain column, or a key inside its jsonb column. */
function columnOf(f: FieldDef): SQL {
  return f.json
    ? sql`${sql.identifier(snake(f.json))} ->> ${f.key}`
    : sql`${sql.identifier(snake(f.key))}::text`;
}

/** Value counts of one text column, where a cell may hold several values joined by ", " (Discipline). */
async function valueCounts(q: Query, table: string, column: SQL): Promise<Map<string, number>> {
  const rows = (await q.execute(
    sql`select ${column} as v, count(*)::int as n from ${sql.identifier(table)} where ${column} is not null and ${column} <> '' group by 1`,
  )) as unknown as { v: string; n: number }[];
  const out = new Map<string, number>();
  for (const r of rows) {
    for (const v of new Set([r.v.trim(), ...r.v.split(",").map((s) => s.trim())])) {
      if (v) out.set(v, (out.get(v) ?? 0) + r.n);
    }
  }
  return out;
}

/* ------------------------------------------------------------------------------------------- */
/* Registers                                                                                   */
/* ------------------------------------------------------------------------------------------- */

/** What to do instead of deleting a row that is in use (GIS-STD-001 2.1 rule 6: keep the history). */
const INSTEAD: Record<RegisterKey, string> = {
  projects: "Set its Project Status instead.",
  packages: "Set its status instead.",
  schema: "Set its status instead.",
  resources: "End the allocation dates instead.",
  updates: "Edit it instead.",
  risks: "Set its status to Closed instead.",
  rfis: "Set its status to Closed instead.",
  qaqc: "Edit it instead.",
  standards: "Set its status instead.",
  innovation: "Set its status instead.",
};

/** Schema Tracker rows that name the project only by its label (no project id). */
async function projectExtras(
  q: Query,
  rows: Record<string, unknown>[],
): Promise<Map<string, UsagePart[]>> {
  const out = new Map<string, UsagePart[]>();
  for (const r of rows) {
    const [c] = (await q.execute(
      sql`select count(*)::int as n from schema_feature where project_id is null and project_label = ${String(r.name ?? "")}`,
    )) as unknown as { n: number }[];
    if (c?.n)
      out.set(String(r.id), [{ label: "schema_feature", table: "schema_feature", count: c.n }]);
  }
  return out;
}

/**
 * The Resources sheet is the source of the people dropdowns (Owner, Assigned To, Reviewer...). The
 * last resource row of a person is in use while another register still names that person.
 */
async function resourceExtras(
  q: Query,
  rows: Record<string, unknown>[],
): Promise<Map<string, UsagePart[]>> {
  const out = new Map<string, UsagePart[]>();
  const peopleFields = Object.values(REGISTERS).flatMap((def) =>
    def.fields.filter((f) => f.people && !f.json).map((f) => ({ table: TABLE[def.key], f })),
  );
  for (const r of rows) {
    const name = String(r.name ?? "").trim();
    if (!name) continue;
    const [others] = (await q.execute(
      sql`select count(*)::int as n from resource_row where name = ${name} and id <> ${String(r.id)}::uuid`,
    )) as unknown as { n: number }[];
    if (others?.n) continue; // another row keeps the person in the dropdowns
    const parts: UsagePart[] = [];
    for (const { table, f } of peopleFields) {
      const [c] = (await q.execute(
        sql`select count(*)::int as n from ${sql.identifier(table)} where ${sql.identifier(snake(f.key))} = ${name}`,
      )) as unknown as { n: number }[];
      if (c?.n) {
        const same = parts.find((p) => p.table === table);
        if (same) same.count += c.n;
        else parts.push({ label: table, table, suffix: `naming ${name}`, count: c.n });
      }
    }
    if (parts.length) out.set(String(r.id), parts);
  }
  return out;
}

export function registerDeleteRule(key: RegisterKey): DeleteRule {
  return {
    table: TABLE[key],
    // The project update page parts (workflow band, GIS Enterprise Applications box) belong to the project.
    owned: key === "projects" ? ["enterprise_app", "workflow_step"] : [],
    extras: key === "projects" ? projectExtras : key === "resources" ? resourceExtras : undefined,
    instead: INSTEAD[key],
  };
}

/** Owned parts per record type, for the handover and the tests. */
export const OWNED_PARTS: Record<string, readonly string[]> = {
  project: ["enterprise_app", "workflow_step"],
};

/* ------------------------------------------------------------------------------------------- */
/* Lists values                                                                                */
/* ------------------------------------------------------------------------------------------- */

interface ListRow {
  id: string;
  listKey: string;
  value: string;
}

/** Columns outside the registers that take a list value. */
const OTHER_LIST_COLUMNS: Partial<Record<ListKey, { table: string; column: string }[]>> = {
  geometryType: [{ table: "client_feature_class", column: "geometry_type" }],
  discipline: [{ table: "client_feature_class", column: "discipline" }],
  workflowStatus: [{ table: "workflow_step", column: "status" }],
};

async function listExtras(q: Query, rows: ListRow[]): Promise<Map<string, UsagePart[]>> {
  const out = new Map<string, UsagePart[]>();
  const add = (id: string, table: string, n: number) => {
    if (!n) return;
    const parts = out.get(id) ?? [];
    const same = parts.find((p) => p.table === table);
    if (same) same.count += n;
    else parts.push({ label: table, table, count: n });
    out.set(id, parts);
  };
  const keys = new Set(rows.map((r) => r.listKey as ListKey));
  for (const key of keys) {
    const ofKey = rows.filter((r) => r.listKey === key);
    // Register columns whose dropdown is this list.
    for (const def of Object.values(REGISTERS)) {
      for (const f of def.fields.filter((x) => x.list === key)) {
        const counts = await valueCounts(q, TABLE[def.key], columnOf(f));
        for (const r of ofKey) {
          const n = counts.get(r.value.trim()) ?? 0;
          add(r.id, TABLE[def.key], n);
        }
      }
    }
    for (const o of OTHER_LIST_COLUMNS[key] ?? []) {
      const counts = await valueCounts(q, o.table, sql`${sql.identifier(o.column)}::text`);
      for (const r of ofKey) {
        const n = counts.get(r.value.trim()) ?? 0;
        add(r.id, o.table, n);
      }
    }
  }
  // Region scopes of role grants point at the Hub / Region value by id, without a foreign key.
  // Revoked grants count too: they are the access history.
  const regionIds = rows.filter((r) => r.listKey === "region").map((r) => r.id);
  if (regionIds.length) {
    const scoped = (await q.execute(
      sql`select scope_id::text as id, count(*)::int as n from role_assignment where scope_type = 'REGION' and scope_id = any(${sql`array[${sql.join(
        regionIds.map((id) => sql`${id}`),
        sql`, `,
      )}]::uuid[]`}) group by 1`,
    )) as unknown as { id: string; n: number }[];
    for (const s of scoped) add(s.id, "role_assignment", s.n);
  }
  return out;
}

export const LIST_DELETE_RULE: DeleteRule<ListRow> = {
  table: "list_item",
  extras: listExtras,
  instead: "Deactivate it instead.",
};

/* ------------------------------------------------------------------------------------------- */
/* Report periods                                                                              */
/* ------------------------------------------------------------------------------------------- */

interface PeriodRow {
  id: string;
  startDate: string;
  endDate: string;
}

async function periodExtras(q: Query, rows: PeriodRow[]): Promise<Map<string, UsagePart[]>> {
  const out = new Map<string, UsagePart[]>();
  const [current] = (await q.execute(
    sql`select value #>> '{}' as v from app_setting where key = 'report.currentPeriodStart'`,
  )) as unknown as { v: string | null }[];
  for (const r of rows) {
    const parts: UsagePart[] = [];
    const [c] = (await q.execute(
      sql`select count(*)::int as n from update_item where period_from between ${r.startDate}::date and ${r.endDate}::date`,
    )) as unknown as { n: number }[];
    if (c?.n) parts.push({ label: "update_item", table: "update_item", count: c.n });
    if (current?.v && current.v === String(r.startDate))
      parts.push({ label: "current report period setting", count: 1 });
    if (parts.length) out.set(r.id, parts);
  }
  return out;
}

export const PERIOD_DELETE_RULE: DeleteRule<PeriodRow> = {
  table: "report_period",
  extras: periodExtras,
  instead: "Keep the period in the calendar.",
};
