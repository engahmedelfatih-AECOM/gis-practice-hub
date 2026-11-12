import "server-only";
import { and, asc, eq, max } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import { LIST_KEYS, LIST_KEY_VALUES, type ListKey } from "@/domain/shared/enums";
import { uuidSchema } from "@/domain/shared/schema";
import { db } from "@/infrastructure/db/client";
import { listItem } from "@/infrastructure/db/schema";
import type { Actor } from "@/application/auth/actor";
import { writeAudit } from "@/application/audit/audit";
import { notFound } from "@/application/errors";
import { assertCan, parseInput } from "@/application/shared/guard";
import { withTx } from "@/application/shared/service";
import { deleteIfUnused, usageOf } from "@/application/shared/usage";
import { LIST_DELETE_RULE } from "./delete-rules";

export interface ListValue {
  id: string;
  value: string;
  group: string | null;
}

/** Active values of one dropdown list, in sheet order. Internal read: lists feed every screen. */
export const listValues = cache(async (key: ListKey): Promise<ListValue[]> => {
  return db
    .select({ id: listItem.id, value: listItem.value, group: listItem.group })
    .from(listItem)
    .where(and(eq(listItem.listKey, key), eq(listItem.isActive, true)))
    .orderBy(asc(listItem.sortOrder), asc(listItem.value));
});

/** Discipline to Discipline Group map (the two columns of the Lists sheet). */
export const disciplineGroups = cache(async (): Promise<Map<string, string>> => {
  const rows = await listValues("discipline");
  return new Map(rows.filter((r) => r.group).map((r) => [r.value, r.group!]));
});

export interface ListAdminRow extends ListValue {
  listKey: ListKey;
  sortOrder: number;
  isActive: boolean;
  /** "Used by 4 packages. Deactivate it instead." or null when the value may be deleted. */
  usedBy: string | null;
}

export async function listAll(actor: Actor): Promise<Record<ListKey, ListAdminRow[]>> {
  assertCan(actor, "list:manage");
  const rows = await db.select().from(listItem).orderBy(asc(listItem.listKey), asc(listItem.sortOrder), asc(listItem.value));
  const out = Object.fromEntries(LIST_KEY_VALUES.map((k) => [k, [] as ListAdminRow[]])) as Record<ListKey, ListAdminRow[]>;
  const usage = await usageOf(db, LIST_DELETE_RULE, rows);
  for (const r of rows)
    out[r.listKey as ListKey]?.push({
      id: r.id,
      value: r.value,
      group: r.group,
      listKey: r.listKey as ListKey,
      sortOrder: r.sortOrder,
      isActive: r.isActive,
      usedBy: usage.get(r.id)?.note ?? null,
    });
  return out;
}

const itemInput = z.object({
  listKey: z.enum(LIST_KEY_VALUES as [ListKey, ...ListKey[]]),
  value: z.string().trim().min(1, "Value is required.").max(200),
  group: z.string().trim().max(120).optional().or(z.literal("")).transform((s) => (s ? s : null)),
});

export async function addListValue(actor: Actor, raw: unknown): Promise<void> {
  assertCan(actor, "list:manage");
  const input = parseInput(itemInput, raw);
  await withTx(async (tx) => {
    const [m] = await tx.select({ n: max(listItem.sortOrder) }).from(listItem).where(eq(listItem.listKey, input.listKey));
    const [row] = await tx
      .insert(listItem)
      .values({ listKey: input.listKey, value: input.value, group: input.group, sortOrder: (m?.n ?? 0) + 1 })
      .returning();
    await writeAudit(tx, actor, { action: "list.add", entityType: "list_item", entityId: row!.id, after: row });
  });
}

export async function updateListValue(actor: Actor, raw: unknown): Promise<void> {
  assertCan(actor, "list:manage");
  const input = parseInput(
    z.object({
      id: uuidSchema,
      value: z.string().trim().min(1).max(200),
      group: z.string().trim().max(120).optional().or(z.literal("")).transform((s) => (s ? s : null)),
      isActive: z.union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal(""), z.boolean()]).optional().transform((v) => v === "on" || v === "true" || v === true),
    }),
    raw,
  );
  await withTx(async (tx) => {
    const [before] = await tx.select().from(listItem).where(eq(listItem.id, input.id));
    if (!before) throw notFound("List value");
    const [after] = await tx.update(listItem).set({ value: input.value, group: input.group, isActive: input.isActive }).where(eq(listItem.id, input.id)).returning();
    await writeAudit(tx, actor, { action: "list.update", entityType: "list_item", entityId: input.id, before, after });
  });
}

/** Delete a list value added by mistake: only while no row, scope or tracker uses it (decision 2026-11-12). */
export async function deleteListValue(actor: Actor, rawId: unknown): Promise<void> {
  assertCan(actor, "list:manage");
  const id = parseInput(uuidSchema, rawId);
  await withTx(async (tx) => {
    const [target] = await tx.select({ value: listItem.value }).from(listItem).where(eq(listItem.id, id));
    if (!target) throw notFound("List value");
    const before = await deleteIfUnused(tx, LIST_DELETE_RULE, id, `"${target.value}"`);
    await writeAudit(tx, actor, { action: "list.delete", entityType: "list_item", entityId: id, before });
  });
}

export const LIST_LABELS = LIST_KEYS;
