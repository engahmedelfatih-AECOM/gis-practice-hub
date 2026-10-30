import "server-only";
import { and, asc, count, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { headers } from "next/headers";
import {
  changeOwnPasswordInput,
  roleAssignmentInput,
  userCreateInput,
  userResetPasswordInput,
  userUpdateInput,
} from "@/domain/identity/schema";
import { paginationSchema, uuidSchema, type Page } from "@/domain/shared/schema";
import { auth } from "@/infrastructure/auth/auth";
import { db } from "@/infrastructure/db/client";
import {
  appUser,
  authAccount,
  authSession,
  listItem,
  roleAssignment,
} from "@/infrastructure/db/schema";
import type { Actor } from "@/application/auth/actor";
import { writeAudit } from "@/application/audit/audit";
import { conflict, notFound, validation } from "@/application/errors";
import { assertCan, parseInput } from "@/application/shared/guard";
import { countWhere, likePattern, offsetOf, paginate, withTx } from "@/application/shared/service";

export interface UserView {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  mustChangePassword: boolean;
  authProvider: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  roleCount: number;
}

export interface RoleAssignmentView {
  id: string;
  role: string;
  scopeType: string;
  scopeId: string | null;
  scopeName: string | null;
  grantedAt: Date;
  revokedAt: Date | null;
}

export interface UserFilter {
  q?: string | null;
  includeInactive?: boolean;
  page?: unknown;
  pageSize?: unknown;
}

// Correlated subquery: the outer table is referenced by its SQL name on purpose. Drizzle renders
// `${appUser.id}` unqualified in single-table queries, which would bind to the inner table.
const roleCountExpr = sql<number>`(select count(*)::int from role_assignment r where r.user_id = "app_user"."id" and r.revoked_at is null)`;

export async function listUsers(actor: Actor, filter: UserFilter = {}): Promise<Page<UserView>> {
  assertCan(actor, "user:read");
  const p = parseInput(paginationSchema, { page: filter.page, pageSize: filter.pageSize });
  const conds: SQL[] = [];
  if (!filter.includeInactive) conds.push(eq(appUser.isActive, true));
  const like = likePattern(filter.q);
  if (like) conds.push(or(ilike(appUser.email, like), ilike(appUser.name, like))!);
  const where = conds.length ? and(...conds) : undefined;
  const [items, total] = await Promise.all([
    db
      .select({
        id: appUser.id,
        email: appUser.email,
        name: appUser.name,
        isActive: appUser.isActive,
        mustChangePassword: appUser.mustChangePassword,
        authProvider: appUser.authProvider,
        lastLoginAt: appUser.lastLoginAt,
        createdAt: appUser.createdAt,
        roleCount: roleCountExpr,
      })
      .from(appUser)
      .where(where)
      .orderBy(asc(appUser.name))
      .limit(p.pageSize)
      .offset(offsetOf(p)),
    countWhere(appUser, where),
  ]);
  return paginate(items, total, p);
}

/** Minimal list for pickers (project members etc.). */
export async function listActiveUserOptions(
  actor: Actor,
): Promise<{ id: string; label: string }[]> {
  assertCan(actor, "user:read");
  const rows = await db
    .select({ id: appUser.id, name: appUser.name, email: appUser.email })
    .from(appUser)
    .where(eq(appUser.isActive, true))
    .orderBy(asc(appUser.name));
  return rows.map((r) => ({ id: r.id, label: `${r.name} (${r.email})` }));
}

export async function getUser(actor: Actor, id: string): Promise<UserView> {
  assertCan(actor, "user:read");
  const [row] = await db
    .select({
      id: appUser.id,
      email: appUser.email,
      name: appUser.name,
      isActive: appUser.isActive,
      mustChangePassword: appUser.mustChangePassword,
      authProvider: appUser.authProvider,
      lastLoginAt: appUser.lastLoginAt,
      createdAt: appUser.createdAt,
      roleCount: roleCountExpr,
    })
    .from(appUser)
    .where(eq(appUser.id, id))
    .limit(1);
  if (!row) throw notFound("User");
  return row;
}

export async function listRoleAssignments(
  actor: Actor,
  userId: string,
): Promise<RoleAssignmentView[]> {
  assertCan(actor, "user:read");
  const rows = await db
    .select({
      id: roleAssignment.id,
      role: roleAssignment.role,
      scopeType: roleAssignment.scopeType,
      scopeId: roleAssignment.scopeId,
      grantedAt: roleAssignment.grantedAt,
      revokedAt: roleAssignment.revokedAt,
      regionName: listItem.value,
    })
    .from(roleAssignment)
    .leftJoin(
      listItem,
      and(eq(roleAssignment.scopeType, "REGION"), eq(listItem.id, roleAssignment.scopeId)),
    )
    .where(eq(roleAssignment.userId, userId))
    .orderBy(desc(roleAssignment.grantedAt));
  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    scopeType: r.scopeType,
    scopeId: r.scopeId,
    scopeName: r.regionName ?? null,
    grantedAt: r.grantedAt,
    revokedAt: r.revokedAt,
  }));
}

/**
 * Provision a local account. The temporary password must be changed at first
 * sign-in. There is no self sign-up anywhere in the system.
 */
export async function createUser(actor: Actor, raw: unknown): Promise<{ id: string }> {
  assertCan(actor, "user:manage");
  const input = parseInput(userCreateInput, raw);
  const passwordHash = await hashPassword(input.temporaryPassword);
  return withTx(async (tx) => {
    const [user] = await tx
      .insert(appUser)
      .values({
        email: input.email,
        name: input.name,
        emailVerified: false,
        isActive: true,
        mustChangePassword: true,
        authProvider: "LOCAL",
      })
      .returning();
    await tx.insert(authAccount).values({
      userId: user!.id,
      accountId: user!.id,
      providerId: "credential",
      password: passwordHash,
    });
    await writeAudit(tx, actor, {
      action: "user.create",
      entityType: "app_user",
      entityId: user!.id,
      after: { id: user!.id, email: user!.email, name: user!.name },
    });
    return { id: user!.id };
  });
}

export async function updateUser(actor: Actor, raw: unknown): Promise<void> {
  assertCan(actor, "user:manage");
  const input = parseInput(userUpdateInput, raw);
  if (input.id === actor.userId && !input.isActive)
    throw validation("You cannot deactivate your own account.");
  await withTx(async (tx) => {
    const [before] = await tx.select().from(appUser).where(eq(appUser.id, input.id)).limit(1);
    if (!before) throw notFound("User");
    if (!input.isActive && before.isActive) await assertNotLastAdministrator(tx, input.id);
    const [after] = await tx
      .update(appUser)
      .set({ name: input.name, isActive: input.isActive })
      .where(eq(appUser.id, input.id))
      .returning();
    if (!input.isActive) {
      // Immediate revocation: a deactivated user loses every session now.
      await tx.delete(authSession).where(eq(authSession.userId, input.id));
    }
    await writeAudit(tx, actor, {
      action:
        input.isActive === before.isActive
          ? "user.update"
          : input.isActive
            ? "user.reactivate"
            : "user.deactivate",
      entityType: "app_user",
      entityId: input.id,
      before: { name: before.name, isActive: before.isActive },
      after: { name: after!.name, isActive: after!.isActive },
    });
  });
}

/** Administrator sets a new temporary password and signs the user out everywhere. */
export async function resetUserPassword(actor: Actor, raw: unknown): Promise<void> {
  assertCan(actor, "user:manage");
  const input = parseInput(userResetPasswordInput, raw);
  const passwordHash = await hashPassword(input.temporaryPassword);
  await withTx(async (tx) => {
    const [user] = await tx
      .select({ id: appUser.id, authProvider: appUser.authProvider })
      .from(appUser)
      .where(eq(appUser.id, input.id));
    if (!user) throw notFound("User");
    if (user.authProvider !== "LOCAL")
      throw validation("Passwords are managed by the identity provider for this user.");
    const updated = await tx
      .update(authAccount)
      .set({ password: passwordHash })
      .where(and(eq(authAccount.userId, input.id), eq(authAccount.providerId, "credential")))
      .returning({ id: authAccount.id });
    if (updated.length === 0) {
      await tx.insert(authAccount).values({
        userId: input.id,
        accountId: input.id,
        providerId: "credential",
        password: passwordHash,
      });
    }
    await tx.update(appUser).set({ mustChangePassword: true }).where(eq(appUser.id, input.id));
    await tx.delete(authSession).where(eq(authSession.userId, input.id));
    await writeAudit(tx, actor, {
      action: "user.resetPassword",
      entityType: "app_user",
      entityId: input.id,
    });
  });
}

/** The signed-in user changes their own password (also clears the must-change flag). */
export async function changeOwnPassword(actor: Actor, raw: unknown): Promise<void> {
  const input = parseInput(changeOwnPasswordInput, raw);
  if (input.currentPassword === input.newPassword) {
    throw validation("Choose a different password.", {
      newPassword: ["New password must differ from the current one."],
    });
  }
  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: true,
      },
    });
  } catch {
    throw validation("Current password is incorrect.", {
      currentPassword: ["Current password is incorrect."],
    });
  }
  await withTx(async (tx) => {
    await tx.update(appUser).set({ mustChangePassword: false }).where(eq(appUser.id, actor.userId));
    await writeAudit(tx, actor, {
      action: "user.changePassword",
      entityType: "app_user",
      entityId: actor.userId,
    });
  });
}

export async function grantRole(actor: Actor, raw: unknown): Promise<void> {
  assertCan(actor, "user:manage");
  const input = parseInput(roleAssignmentInput, raw);
  await withTx(async (tx) => {
    const [user] = await tx
      .select({ id: appUser.id })
      .from(appUser)
      .where(eq(appUser.id, input.userId));
    if (!user) throw notFound("User");
    if (input.scopeType === "REGION") {
      const [r] = await tx
        .select({ id: listItem.id })
        .from(listItem)
        .where(and(eq(listItem.id, input.scopeId!), eq(listItem.listKey, "region")));
      if (!r) throw validation("Region not found.", { scopeId: ["Choose a valid region."] });
    }
    const [row] = await tx
      .insert(roleAssignment)
      .values({ ...input, grantedBy: actor.userId })
      .returning();
    await writeAudit(tx, actor, {
      action: "user.grantRole",
      entityType: "app_user",
      entityId: input.userId,
      after: row,
    });
  });
}

export async function revokeRole(actor: Actor, rawId: unknown): Promise<void> {
  assertCan(actor, "user:manage");
  const id = parseInput(uuidSchema, rawId);
  await withTx(async (tx) => {
    const [before] = await tx
      .select()
      .from(roleAssignment)
      .where(and(eq(roleAssignment.id, id), isNull(roleAssignment.revokedAt)));
    if (!before) throw notFound("Role assignment");
    if (before.role === "ADMINISTRATOR") await assertNotLastAdministrator(tx, before.userId);
    const [after] = await tx
      .update(roleAssignment)
      .set({ revokedAt: new Date(), revokedBy: actor.userId })
      .where(eq(roleAssignment.id, id))
      .returning();
    await writeAudit(tx, actor, {
      action: "user.revokeRole",
      entityType: "app_user",
      entityId: before.userId,
      before,
      after,
    });
  });
}

/** The system must always keep at least one other active Administrator. */
async function assertNotLastAdministrator(
  tx: Parameters<Parameters<typeof withTx>[0]>[0],
  userId: string,
) {
  const [row] = await tx
    .select({ n: count() })
    .from(roleAssignment)
    .innerJoin(appUser, eq(appUser.id, roleAssignment.userId))
    .where(
      and(
        eq(roleAssignment.role, "ADMINISTRATOR"),
        isNull(roleAssignment.revokedAt),
        eq(appUser.isActive, true),
        sql`${roleAssignment.userId} <> ${userId}`,
      ),
    );
  if ((row?.n ?? 0) === 0) throw conflict("This would remove the last active Administrator.");
}
