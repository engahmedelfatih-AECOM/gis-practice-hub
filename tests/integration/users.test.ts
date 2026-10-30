import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import {
  createUser,
  grantRole,
  listRoleAssignments,
  resetUserPassword,
  revokeRole,
  updateUser,
} from "@/application/identity/users";
import { isAppError } from "@/application/errors";
import { admin, db, makeActor, resetDb, schema, seedRegion } from "./helpers";

beforeEach(resetDb);

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "OK";
  } catch (err) {
    if (isAppError(err)) return err.code;
    throw err;
  }
}

describe("user provisioning", () => {
  it("creates a local account with a hashed temporary password that must be changed", async () => {
    const a = await admin();
    const { id } = await createUser(a, {
      email: "New.User@Example.com",
      name: "New User",
      temporaryPassword: "Temporary-Pass-123",
    });
    const [user] = await db.select().from(schema.appUser).where(eq(schema.appUser.id, id));
    expect(user!.email).toBe("new.user@example.com");
    expect(user!.mustChangePassword).toBe(true);
    const [account] = await db
      .select()
      .from(schema.authAccount)
      .where(eq(schema.authAccount.userId, id));
    expect(account!.providerId).toBe("credential");
    expect(account!.password).not.toBe("Temporary-Pass-123");
    expect(await verifyPassword({ hash: account!.password!, password: "Temporary-Pass-123" })).toBe(
      true,
    );
    const audit = await db.select().from(schema.auditLog).where(eq(schema.auditLog.entityId, id));
    expect(audit.some((r) => r.action === "user.create")).toBe(true);
    // The audit snapshot never contains the password hash.
    expect(JSON.stringify(audit)).not.toContain(account!.password!.slice(0, 12));
  });

  it("rejects weak passwords and duplicate e-mails", async () => {
    const a = await admin();
    expect(
      await code(createUser(a, { email: "x@example.com", name: "X", temporaryPassword: "short" })),
    ).toBe("VALIDATION");
    await createUser(a, {
      email: "dup@example.com",
      name: "X",
      temporaryPassword: "Temporary-Pass-123",
    });
    expect(
      await code(
        createUser(a, {
          email: "DUP@example.com",
          name: "Y",
          temporaryPassword: "Temporary-Pass-123",
        }),
      ),
    ).toBe("CONFLICT");
  });

  it("only Administrators may manage users", async () => {
    const dd = await makeActor([{ role: "GIS_MANAGER" }]);
    expect(
      await code(
        createUser(dd, {
          email: "x@example.com",
          name: "X",
          temporaryPassword: "Temporary-Pass-123",
        }),
      ),
    ).toBe("FORBIDDEN");
  });

  it("deactivation revokes all sessions immediately", async () => {
    const a = await admin();
    const { id } = await createUser(a, {
      email: "u@example.com",
      name: "U",
      temporaryPassword: "Temporary-Pass-123",
    });
    await db
      .insert(schema.authSession)
      .values({ userId: id, token: "tok-1", expiresAt: new Date(Date.now() + 3600_000) });
    await updateUser(a, { id, name: "U", isActive: "" });
    expect(
      await db.select().from(schema.authSession).where(eq(schema.authSession.userId, id)),
    ).toHaveLength(0);
    const [user] = await db.select().from(schema.appUser).where(eq(schema.appUser.id, id));
    expect(user!.isActive).toBe(false);
  });

  it("an administrator cannot deactivate themselves", async () => {
    const a = await admin();
    expect(await code(updateUser(a, { id: a.userId, name: a.name, isActive: "" }))).toBe(
      "VALIDATION",
    );
  });

  it("password reset rotates the hash, forces a change and signs out everywhere", async () => {
    const a = await admin();
    const { id } = await createUser(a, {
      email: "u@example.com",
      name: "U",
      temporaryPassword: "Temporary-Pass-123",
    });
    await db
      .update(schema.appUser)
      .set({ mustChangePassword: false })
      .where(eq(schema.appUser.id, id));
    await db
      .insert(schema.authSession)
      .values({ userId: id, token: "tok-1", expiresAt: new Date(Date.now() + 3600_000) });
    await resetUserPassword(a, { id, temporaryPassword: "Another-Temp-Pass-456" });
    const [account] = await db
      .select()
      .from(schema.authAccount)
      .where(eq(schema.authAccount.userId, id));
    expect(
      await verifyPassword({ hash: account!.password!, password: "Another-Temp-Pass-456" }),
    ).toBe(true);
    const [user] = await db.select().from(schema.appUser).where(eq(schema.appUser.id, id));
    expect(user!.mustChangePassword).toBe(true);
    expect(
      await db.select().from(schema.authSession).where(eq(schema.authSession.userId, id)),
    ).toHaveLength(0);
  });
});

describe("role assignments", () => {
  it("grants and revokes scoped roles, keeping revoked rows for history", async () => {
    const a = await admin();
    const region = await seedRegion();
    const { id } = await createUser(a, {
      email: "tl@example.com",
      name: "TL",
      temporaryPassword: "Temporary-Pass-123",
    });
    await grantRole(a, { userId: id, role: "GIS_LEAD", scopeType: "REGION", scopeId: region.id });
    expect(
      await code(
        grantRole(a, { userId: id, role: "GIS_LEAD", scopeType: "REGION", scopeId: region.id }),
      ),
    ).toBe("CONFLICT");
    expect(
      await code(
        grantRole(a, {
          userId: id,
          role: "GIS_LEAD",
          scopeType: "REGION",
          scopeId: crypto.randomUUID(),
        }),
      ),
    ).toBe("VALIDATION");
    const [active] = await listRoleAssignments(a, id);
    expect(active!.scopeName).toBe("India");
    await revokeRole(a, active!.id);
    const after = await listRoleAssignments(a, id);
    expect(after).toHaveLength(1);
    expect(after[0]!.revokedAt).not.toBeNull();
    // Re-granting after revocation is allowed (partial unique index ignores revoked rows).
    await grantRole(a, { userId: id, role: "GIS_LEAD", scopeType: "REGION", scopeId: region.id });
  });

  it("the last active Administrator can be neither revoked nor deactivated", async () => {
    const a = await admin();
    const [mine] = await listRoleAssignments(a, a.userId);
    expect(await code(revokeRole(a, mine!.id))).toBe("CONFLICT");
    const { id } = await createUser(a, {
      email: "b@example.com",
      name: "B",
      temporaryPassword: "Temporary-Pass-123",
    });
    await grantRole(a, { userId: id, role: "ADMINISTRATOR", scopeType: "GLOBAL", scopeId: "" });
    expect(await code(revokeRole(a, mine!.id))).toBe("OK");
  });
});

describe("user listing", () => {
  it("reports the number of active role assignments per user", async () => {
    const a = await admin();
    const { listUsers } = await import("@/application/identity/users");
    const page = await listUsers(a);
    const me = page.items.find((u) => u.id === a.userId);
    expect(me?.roleCount).toBe(1);
  });
});
