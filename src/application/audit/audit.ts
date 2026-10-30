import "server-only";
import { isIP } from "node:net";
import { auditLog } from "@/infrastructure/db/schema";
import type { Tx } from "@/infrastructure/db/client";
import type { Actor } from "@/application/auth/actor";

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  correlationId?: string;
}

/** Fields never written to the audit log, even inside before/after snapshots. */
const REDACTED_KEYS = new Set(["password", "passwordHash", "token", "secret", "mfaSecretEnc"]);

export function redact<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact) as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACTED_KEYS.has(k) ? "[redacted]" : redact(v);
  }
  return out as T;
}

/**
 * Normalise a client address for the inet column. Proxies (Render, Azure Front
 * Door) may forward an empty value or a comma-separated chain; anything that is
 * not a single valid IPv4/IPv6 address is stored as null rather than failing
 * the whole transaction.
 */
export function normaliseIp(value: string | null | undefined): string | null {
  if (!value) return null;
  const first = value.split(",")[0]!.trim();
  return isIP(first) ? first : null;
}

/**
 * Write an audit row inside the caller's transaction, so a failed business
 * write never leaves a dangling audit entry and vice versa.
 */
export async function writeAudit(tx: Tx, actor: Actor | null, entry: AuditEntry): Promise<void> {
  await tx.insert(auditLog).values({
    actorUserId: actor?.userId ?? null,
    actorIp: normaliseIp(actor?.ipAddress),
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    before: entry.before === undefined ? null : redact(entry.before),
    after: entry.after === undefined ? null : redact(entry.after),
    correlationId: entry.correlationId ?? null,
  });
}
