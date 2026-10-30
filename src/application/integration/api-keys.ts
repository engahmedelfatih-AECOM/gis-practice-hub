import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { apiKey } from "@/infrastructure/db/schema";
import type { Actor } from "@/application/auth/actor";
import { writeAudit } from "@/application/audit/audit";
import { validation } from "@/application/errors";
import { assertCan } from "@/application/shared/guard";
import { withTx } from "@/application/shared/service";

export type ApiKeyRow = typeof apiKey.$inferSelect;
export const API_KEY_SCOPES = ["hub:read"] as const;

const PREFIX = "rpk_";

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function listApiKeys(actor: Actor): Promise<ApiKeyRow[]> {
  assertCan(actor, "apiKey:manage");
  return db.select().from(apiKey).orderBy(desc(apiKey.createdAt));
}

/** Create a key. The plain key is returned once and never stored. */
export async function createApiKey(
  actor: Actor,
  raw: { name?: unknown },
): Promise<{ key: string; row: ApiKeyRow }> {
  assertCan(actor, "apiKey:manage");
  const name = String(raw.name ?? "").trim();
  if (name.length < 2 || name.length > 80)
    throw validation("Give the key a name of 2 to 80 characters.");
  const secret = randomBytes(32).toString("base64url");
  const key = `${PREFIX}${secret}`;
  const prefix = key.slice(0, PREFIX.length + 6);
  return withTx(async (tx) => {
    const [row] = await tx
      .insert(apiKey)
      .values({
        name,
        prefix,
        keyHash: hashKey(key),
        scopes: [...API_KEY_SCOPES],
        createdBy: actor.userId,
      })
      .returning();
    await writeAudit(tx, actor, {
      action: "apiKey.create",
      entityType: "api_key",
      entityId: row!.id,
      after: { name, prefix },
    });
    return { key, row: row! };
  });
}

export async function revokeApiKey(actor: Actor, id: string): Promise<void> {
  assertCan(actor, "apiKey:manage");
  await withTx(async (tx) => {
    const [row] = await tx
      .update(apiKey)
      .set({ revokedAt: new Date(), revokedBy: actor.userId })
      .where(and(eq(apiKey.id, id), isNull(apiKey.revokedAt)))
      .returning();
    if (!row) throw validation("Key not found or already revoked.");
    await writeAudit(tx, actor, {
      action: "apiKey.revoke",
      entityType: "api_key",
      entityId: id,
      before: { name: row.name, prefix: row.prefix },
    });
  });
}

export interface ApiPrincipal {
  keyId: string;
  name: string;
  scopes: string[];
}

/** Resolve the `x-api-key` header to a live key. Returns null when missing, unknown or revoked. */
export async function authenticateApiKey(
  header: string | null | undefined,
): Promise<ApiPrincipal | null> {
  const key = header?.trim();
  if (!key || !key.startsWith(PREFIX)) return null;
  const [row] = await db
    .select()
    .from(apiKey)
    .where(and(eq(apiKey.keyHash, hashKey(key)), isNull(apiKey.revokedAt)))
    .limit(1);
  if (!row) return null;
  // Touch last_used_at at most once a minute to keep the feed cheap.
  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 60_000) {
    await db.update(apiKey).set({ lastUsedAt: new Date() }).where(eq(apiKey.id, row.id));
  }
  return { keyId: row.id, name: row.name, scopes: row.scopes };
}
