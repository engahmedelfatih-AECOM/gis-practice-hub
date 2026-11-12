import "server-only";
import { sql } from "drizzle-orm";
import { db, type Tx } from "@/infrastructure/db/client";
import { conflict, notFound } from "@/application/errors";

/**
 * "Delete a record created by mistake" (decision 2026-11-12).
 *
 * A record may be deleted only when nothing uses it. Every foreign key that points at its table
 * is read from the database catalogue (pg_constraint), including the ones set to cascade or set
 * null, so a delete can never silently remove or blank other data. Links that have no foreign key
 * (a list value typed into a register column, a region scope, a person's name) are counted by the
 * rule's own `extras`. Rows that are only parts of the record (`owned`) go with it; their foreign
 * keys must be ON DELETE CASCADE, which the integration tests check against the catalogue.
 */

type Query = Pick<typeof db, "execute">;

export interface UsagePart {
  /** Noun shown to the user, for example "packages"; recomputed from `table` when it is set. */
  label: string;
  count: number;
  /** Referencing table: parts of the same table are added up and named with its noun. */
  table?: string;
  /** Words after the noun, for example "naming Jane Doe". */
  suffix?: string;
}

export interface Usage {
  total: number;
  parts: UsagePart[];
  /** "Used by 3 packages and 12 schema rows. Deactivate it instead." or null when unused. */
  note: string | null;
}

export interface ForeignKeyRef {
  table: string;
  column: string;
  onDelete: "cascade" | "set null" | "set default" | "restrict" | "no action";
}

export interface DeleteRule<Row extends object = Record<string, unknown>> {
  /** Table of the record, as named in the database. */
  table: string;
  /** Tables whose rows are only parts of the record and are deleted with it (ON DELETE CASCADE). */
  owned?: readonly string[];
  /** Uses that have no foreign key, per record id. */
  extras?: (q: Query, rows: Row[]) => Promise<Map<string, UsagePart[]>>;
  /** What to do instead, shown after the usage, for example "Deactivate it instead." */
  instead: string;
}

/** Plural names of the referencing tables, as the screens call them. */
const NOUNS: Record<string, [string, string]> = {
  project: ["project", "projects"],
  standard_item: ["standard", "standards"],
  innovation_item: ["innovation item", "innovation items"],
  package: ["package", "packages"],
  schema_feature: ["schema row", "schema rows"],
  resource_row: ["resource row", "resource rows"],
  update_item: ["update", "updates"],
  risk: ["risk", "risks"],
  rfi: ["RFI", "RFIs"],
  qaqc_checklist: ["QA/QC checklist", "QA/QC checklists"],
  enterprise_app: ["enterprise application", "enterprise applications"],
  workflow_step: ["workflow step", "workflow steps"],
  client_feature_class: ["Master Tracker row", "Master Tracker rows"],
  role_assignment: ["role scope", "role scopes"],
};

export function noun(table: string, count: number): string {
  const n = NOUNS[table] ?? [table.replace(/_/g, " "), `${table.replace(/_/g, " ")} rows`];
  return count === 1 ? n[0] : n[1];
}

const ON_DELETE: Record<string, ForeignKeyRef["onDelete"]> = {
  a: "no action",
  r: "restrict",
  c: "cascade",
  n: "set null",
  d: "set default",
};

/** Every foreign key that points at `table`, straight from pg_constraint. */
export async function referencingKeys(q: Query, table: string): Promise<ForeignKeyRef[]> {
  const rows = (await q.execute(sql`
    select src.relname as "table", att.attname as "column", con.confdeltype as "onDelete"
    from pg_constraint con
    join pg_class src on src.oid = con.conrelid
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = con.conkey[1]
    where con.contype = 'f' and con.confrelid = to_regclass(${table})
    order by src.relname, att.attname
  `)) as unknown as { table: string; column: string; onDelete: string }[];
  return rows.map((r) => ({
    table: r.table,
    column: r.column,
    onDelete: ON_DELETE[r.onDelete] ?? "no action",
  }));
}

export function usageNote(parts: UsagePart[], instead: string): string | null {
  const used = parts.filter((p) => p.count > 0);
  if (!used.length) return null;
  const words = used.map((p) => `${p.count} ${p.label}`);
  const list =
    words.length === 1 ? words[0] : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
  return `Used by ${list}. ${instead}`;
}

const partKey = (p: UsagePart) => `${p.table ?? p.label}|${p.suffix ?? ""}`;

function merge(into: Map<string, UsagePart[]>, id: string, part: UsagePart) {
  const parts = into.get(id) ?? [];
  const same = parts.find((p) => partKey(p) === partKey(part));
  if (same) same.count += part.count;
  else parts.push({ ...part });
  into.set(id, parts);
}

/**
 * Usage of each record in `rows` (they must carry `id`). One grouped count per foreign key, so a
 * register page of 100 rows costs a handful of queries, not one per row.
 */
export async function usageOf<Row extends object>(
  q: Query,
  rule: DeleteRule<Row>,
  rows: Row[],
): Promise<Map<string, Usage>> {
  const ids = rows.map((r) => String((r as { id?: unknown }).id));
  const byId = new Map<string, UsagePart[]>();
  if (ids.length) {
    const owned = new Set(rule.owned ?? []);
    for (const fk of await referencingKeys(q, rule.table)) {
      if (owned.has(fk.table)) continue;
      const counts = (await q.execute(sql`
        select ${sql.identifier(fk.column)}::text as id, count(*)::int as n
        from ${sql.identifier(fk.table)}
        where ${sql.identifier(fk.column)} = any(${sql`array[${sql.join(
          ids.map((id) => sql`${id}`),
          sql`, `,
        )}]::uuid[]`})
        group by 1
      `)) as unknown as { id: string; n: number }[];
      for (const c of counts) merge(byId, c.id, { label: fk.table, table: fk.table, count: c.n });
    }
    if (rule.extras) {
      for (const [id, parts] of await rule.extras(q, rows))
        for (const p of parts) if (p.count > 0) merge(byId, id, p);
    }
  }
  const out = new Map<string, Usage>();
  for (const id of ids) {
    const parts = (byId.get(id) ?? []).map((p) => ({
      ...p,
      label: `${p.table ? noun(p.table, p.count) : p.label}${p.suffix ? ` ${p.suffix}` : ""}`,
    }));
    const total = parts.reduce((s, p) => s + p.count, 0);
    out.set(id, { total, parts, note: usageNote(parts, rule.instead) });
  }
  return out;
}

/**
 * Delete one record inside the caller's transaction, only if nothing uses it. The row is locked
 * first (SELECT ... FOR UPDATE): a new child row needs a key-share lock on it, so nobody can start
 * using the record between this check and the delete. Returns the deleted row for the audit log.
 */
export async function deleteIfUnused<Row extends object>(
  tx: Tx,
  rule: DeleteRule<Row>,
  id: string,
  label: string,
): Promise<Row> {
  const locked = (await tx.execute(
    sql`select * from ${sql.identifier(rule.table)} where id = ${id}::uuid for update`,
  )) as unknown as Record<string, unknown>[];
  if (!locked[0]) throw notFound(label);
  const row = camel(locked[0]) as Row;
  const usage = (await usageOf(tx, rule, [row])).get(id);
  if (usage?.note) throw conflict(`${label} cannot be deleted. ${usage.note}`);
  await tx.execute(sql`delete from ${sql.identifier(rule.table)} where id = ${id}::uuid`);
  return row;
}

/** snake_case keys of a raw row to the camelCase the application uses. */
function camel(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
      v,
    ]),
  );
}
