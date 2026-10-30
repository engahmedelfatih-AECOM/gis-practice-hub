import "server-only";
import { count, eq, isNull, and } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import { appUser, listItem, project, reportPeriod, roleAssignment } from "@/infrastructure/db/schema";
import type { Actor } from "@/application/auth/actor";
import { can } from "@/domain/authz/policy";

export interface Overview {
  counts: { projects: number; users: number; lists: number; periods: number };
  setup: { label: string; done: boolean; href: string }[];
}

/** Administrator setup checklist shown on the dashboard until every step is done. */
export async function getOverview(actor: Actor): Promise<Overview> {
  const n = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const [projects, users, lists, periods, managers] = await Promise.all([
    n(db.select({ n: count() }).from(project)),
    n(db.select({ n: count() }).from(appUser).where(eq(appUser.isActive, true))),
    n(db.select({ n: count() }).from(listItem)),
    n(db.select({ n: count() }).from(reportPeriod)),
    n(
      db
        .select({ n: count() })
        .from(roleAssignment)
        .where(and(eq(roleAssignment.role, "GIS_MANAGER"), isNull(roleAssignment.revokedAt))),
    ),
  ]);
  const setup = can(actor, "setting:manage")
    ? [
        { label: "Dropdown lists loaded (Lists sheet)", done: lists > 0, href: "/admin/lists" },
        { label: "Report periods defined", done: periods > 0, href: "/admin/periods" },
        { label: "A GIS Manager account exists", done: managers > 0, href: "/admin/users" },
        { label: "First project registered or workbook imported", done: projects > 0, href: "/admin/import" },
      ]
    : [];
  return { counts: { projects, users, lists, periods }, setup };
}
