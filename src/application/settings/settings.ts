import "server-only";
import { eq, inArray } from "drizzle-orm";
import { cache } from "react";
import {
  SETTINGS,
  SETTING_KEYS,
  parseSetting,
  type SettingKey,
  type SettingValue,
} from "@/domain/settings/settings";
import { db } from "@/infrastructure/db/client";
import { appSetting } from "@/infrastructure/db/schema";
import type { Actor } from "@/application/auth/actor";
import { writeAudit } from "@/application/audit/audit";
import { validation } from "@/application/errors";
import { assertCan } from "@/application/shared/guard";
import { withTx } from "@/application/shared/service";

/** Internal read (no authorisation): settings are inputs to business rules, not user data. */
export const getSetting = cache(async <K extends SettingKey>(key: K): Promise<SettingValue<K>> => {
  const [row] = await db.select().from(appSetting).where(eq(appSetting.key, key)).limit(1);
  return parseSetting(key, row?.value);
});

export interface SettingView {
  key: SettingKey;
  label: string;
  value: unknown;
  isDefault: boolean;
  updatedAt: Date | null;
}

export async function listSettings(actor: Actor): Promise<SettingView[]> {
  assertCan(actor, "setting:read");
  const rows = await db.select().from(appSetting).where(inArray(appSetting.key, SETTING_KEYS));
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return SETTING_KEYS.map((key) => {
    const row = byKey.get(key);
    return {
      key,
      label: SETTINGS[key].label,
      value: parseSetting(key, row?.value),
      isDefault: !row,
      updatedAt: row?.updatedAt ?? null,
    };
  });
}

export async function updateSetting(actor: Actor, key: string, rawValue: unknown): Promise<void> {
  assertCan(actor, "setting:manage");
  if (!(SETTING_KEYS as string[]).includes(key)) throw validation("Unknown setting.");
  const k = key as SettingKey;
  const parsed = SETTINGS[k].schema.safeParse(rawValue);
  if (!parsed.success) {
    throw validation("Invalid value.", { value: parsed.error.issues.map((i) => i.message) });
  }
  await withTx(async (tx) => {
    const [before] = await tx.select().from(appSetting).where(eq(appSetting.key, k)).limit(1);
    await tx
      .insert(appSetting)
      .values({ key: k, value: parsed.data, updatedBy: actor.userId, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSetting.key,
        set: { value: parsed.data, updatedBy: actor.userId, updatedAt: new Date() },
      });
    await writeAudit(tx, actor, {
      action: "setting.update",
      entityType: "app_setting",
      before: { key: k, value: before?.value ?? null },
      after: { key: k, value: parsed.data },
    });
  });
}
