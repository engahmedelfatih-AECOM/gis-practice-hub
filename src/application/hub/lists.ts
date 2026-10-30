import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cache } from "react";
import type { ListKey } from "@/domain/shared/enums";
import { db } from "@/infrastructure/db/client";
import { listItem } from "@/infrastructure/db/schema";

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
