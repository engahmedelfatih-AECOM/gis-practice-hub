import "server-only";
import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import { addDays, periodBucket, periodLabel, todayIso } from "@/domain/hub/rules";
import { isoDateSchema, uuidSchema } from "@/domain/shared/schema";
import { db } from "@/infrastructure/db/client";
import { appSetting, reportPeriod } from "@/infrastructure/db/schema";
import type { Actor } from "@/application/auth/actor";
import { writeAudit } from "@/application/audit/audit";
import { notFound, validation } from "@/application/errors";
import { assertCan, parseInput } from "@/application/shared/guard";
import { withTx } from "@/application/shared/service";
import { getSetting } from "@/application/settings/settings";
import { deleteIfUnused, usageOf, type Usage } from "@/application/shared/usage";
import { PERIOD_DELETE_RULE } from "./delete-rules";

export interface PeriodView {
  id: string;
  startDate: string;
  endDate: string;
  label: string;
}

/** All report periods in calendar order (the Lists sheet columns R to T). */
export const listPeriods = cache(async (): Promise<PeriodView[]> => {
  const rows = await db.select().from(reportPeriod).orderBy(asc(reportPeriod.startDate));
  return rows.map((r) => ({ id: r.id, startDate: r.startDate, endDate: r.endDate, label: periodLabel(r.startDate, r.endDate) }));
});

/**
 * The period to show by default. The GIS Manager can set one period as the current report period
 * for everyone (the cream cell of the workbook Dashboard); without it, or when that period is no
 * longer in the calendar, it is the one containing today, else the last one before today, else the first.
 */
export async function defaultPeriod(periods: PeriodView[], today = todayIso(), currentStart = ""): Promise<PeriodView | null> {
  if (!periods.length) return null;
  const set = currentStart ? periods.find((p) => p.startDate === currentStart) : undefined;
  if (set) return set;
  const current = periodBucket(today, periods);
  if (current) return current;
  const before = periods.filter((p) => p.endDate < today);
  return before.length ? before[before.length - 1]! : periods[0]!;
}

/** The period the GIS Manager set as current, or null when the Hub follows today's date. */
export async function currentPeriodSetting(): Promise<PeriodView | null> {
  const start = await readCurrentStart();
  if (!start) return null;
  return (await listPeriods()).find((p) => p.startDate === start) ?? null;
}

/** Read without the per-request cache: the value changes inside one request when the manager sets it. */
async function readCurrentStart(): Promise<string> {
  const [row] = await db.select().from(appSetting).where(eq(appSetting.key, CURRENT_KEY)).limit(1);
  return typeof row?.value === "string" ? row.value : "";
}

const CURRENT_KEY = "report.currentPeriodStart";

/**
 * Set the current report period for everyone, or clear it (empty id) so the Hub follows today's date.
 * Stored by start date, so it survives a regeneration of the calendar that keeps the same dates.
 */
export async function setCurrentPeriod(actor: Actor, rawId: unknown): Promise<PeriodView | null> {
  assertCan(actor, "period:manage");
  const id = parseInput(uuidSchema.or(z.literal("")), rawId ?? "");
  return withTx(async (tx) => {
    let period: PeriodView | null = null;
    if (id) {
      const [row] = await tx.select().from(reportPeriod).where(eq(reportPeriod.id, id));
      if (!row) throw notFound("Report period");
      period = { id: row.id, startDate: row.startDate, endDate: row.endDate, label: periodLabel(row.startDate, row.endDate) };
    }
    const value = period?.startDate ?? "";
    const [before] = await tx.select().from(appSetting).where(eq(appSetting.key, CURRENT_KEY)).limit(1);
    await tx
      .insert(appSetting)
      .values({ key: CURRENT_KEY, value, updatedBy: actor.userId, updatedAt: new Date() })
      .onConflictDoUpdate({ target: appSetting.key, set: { value, updatedBy: actor.userId, updatedAt: new Date() } });
    await writeAudit(tx, actor, {
      action: "period.setCurrent",
      entityType: "report_period",
      entityId: period?.id,
      before: { key: CURRENT_KEY, value: before?.value ?? null },
      after: { key: CURRENT_KEY, value },
    });
    return period;
  });
}

export async function resolvePeriod(id: string | null | undefined): Promise<PeriodView | null> {
  const periods = await listPeriods();
  if (id) {
    const found = periods.find((p) => p.id === id);
    if (found) return found;
  }
  return defaultPeriod(periods, todayIso(), await readCurrentStart());
}

const periodInput = z.object({ startDate: isoDateSchema, endDate: isoDateSchema.optional().or(z.literal("")) });

export async function createPeriod(actor: Actor, raw: unknown): Promise<void> {
  assertCan(actor, "period:manage");
  const input = parseInput(periodInput, raw);
  const days = await getSetting("report.periodDays");
  const endDate = input.endDate || addDays(input.startDate, days - 1);
  if (endDate < input.startDate) throw validation("The end date is before the start date.", { endDate: ["End before start."] });
  await withTx(async (tx) => {
    const [row] = await tx.insert(reportPeriod).values({ startDate: input.startDate, endDate }).returning();
    await writeAudit(tx, actor, { action: "period.create", entityType: "report_period", entityId: row!.id, after: row });
  });
}

/** Regenerate the whole calendar from a first start date: N periods of the configured length. */
export async function regeneratePeriods(actor: Actor, raw: unknown): Promise<number> {
  assertCan(actor, "period:manage");
  const input = parseInput(z.object({ startDate: isoDateSchema, count: z.coerce.number().int().min(1).max(200) }), raw);
  const days = await getSetting("report.periodDays");
  return withTx(async (tx) => {
    await tx.delete(reportPeriod);
    const rows = [];
    for (let i = 0; i < input.count; i++) {
      const s = addDays(input.startDate, i * days);
      rows.push({ startDate: s, endDate: addDays(s, days - 1) });
    }
    await tx.insert(reportPeriod).values(rows);
    await writeAudit(tx, actor, { action: "period.regenerate", entityType: "report_period", after: { startDate: input.startDate, count: input.count, days } });
    return rows.length;
  });
}

export async function updatePeriod(actor: Actor, raw: unknown): Promise<void> {
  assertCan(actor, "period:manage");
  const input = parseInput(z.object({ id: uuidSchema, startDate: isoDateSchema, endDate: isoDateSchema }), raw);
  if (input.endDate < input.startDate) throw validation("The end date is before the start date.", { endDate: ["End before start."] });
  await withTx(async (tx) => {
    const [before] = await tx.select().from(reportPeriod).where(eq(reportPeriod.id, input.id));
    if (!before) throw notFound("Report period");
    const [after] = await tx.update(reportPeriod).set({ startDate: input.startDate, endDate: input.endDate }).where(eq(reportPeriod.id, input.id)).returning();
    await writeAudit(tx, actor, { action: "period.update", entityType: "report_period", entityId: input.id, before, after });
  });
}

/** Delete a report period added by mistake: only while no update falls in it and it is not the current period. */
export async function deletePeriod(actor: Actor, rawId: unknown): Promise<void> {
  assertCan(actor, "period:manage");
  const id = parseInput(uuidSchema, rawId);
  await withTx(async (tx) => {
    const [target] = await tx.select().from(reportPeriod).where(eq(reportPeriod.id, id));
    if (!target) throw notFound("Report period");
    const before = await deleteIfUnused(tx, PERIOD_DELETE_RULE, id, `The period ${periodLabel(target.startDate, target.endDate)}`);
    await writeAudit(tx, actor, { action: "period.delete", entityType: "report_period", entityId: id, before });
  });
}

/** Usage of report periods for their Delete controls. */
export async function periodUsage(actor: Actor, periods: PeriodView[]): Promise<Map<string, Usage>> {
  assertCan(actor, "period:manage");
  return usageOf(db, PERIOD_DELETE_RULE, periods);
}
