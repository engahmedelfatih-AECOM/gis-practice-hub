import "server-only";
import { headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { cache } from "react";
import type { Role, ScopeType } from "@/domain/shared/enums";
import type { Principal, RoleGrant } from "@/domain/authz/policy";
import { auth } from "@/infrastructure/auth/auth";
import { db } from "@/infrastructure/db/client";
import { roleAssignment } from "@/infrastructure/db/schema";
import { unauthenticated } from "@/application/errors";

/** The signed-in user with everything the policy needs. One DB round-trip per request. */
export interface Actor extends Principal {
  email: string;
  name: string;
  sessionId: string;
  mustChangePassword: boolean;
  ipAddress: string | null;
}

/**
 * Resolve the current actor from the session cookie. Cached per request with
 * React `cache` so layouts, pages and actions share one lookup.
 * Returns null for anonymous requests; use `requireActor()` in protected code.
 */
export const getActor = cache(async (): Promise<Actor | null> => {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) return null;
  if (!session.user.isActive) return null;

  const grants = await db
    .select({
      role: roleAssignment.role,
      scopeType: roleAssignment.scopeType,
      scopeId: roleAssignment.scopeId,
    })
    .from(roleAssignment)
    .where(and(eq(roleAssignment.userId, session.user.id), isNull(roleAssignment.revokedAt)));

  const roles: RoleGrant[] = grants.map((g) => ({
    role: g.role as Role,
    scopeType: g.scopeType as ScopeType,
    scopeId: g.scopeId,
  }));

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    sessionId: session.session.id,
    mustChangePassword: Boolean(session.user.mustChangePassword),
    ipAddress: session.session.ipAddress ?? null,
    roles,
  };
});

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw unauthenticated();
  return actor;
}
