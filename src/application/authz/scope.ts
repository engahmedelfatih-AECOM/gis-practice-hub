import "server-only";
import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { scopeFor } from "@/domain/authz/policy";
import type { Action } from "@/domain/authz/permissions";
import { db } from "@/infrastructure/db/client";
import { listItem, project, resourceRow } from "@/infrastructure/db/schema";
import type { Actor } from "@/application/auth/actor";

/**
 * Row-level region scope.
 *
 * A grant with REGION scope names one hub of the Hub / Region list (India, Romania, South Africa,
 * Dubai, Mix EC Resources). A project belongs to the hubs of the people on it, which is the same
 * source as the workbook's "GIS Resources Region" column, so a lead sees the projects their hub
 * works on and nothing else. Rows that belong to no project (Standards, Innovation, the shared
 * QIC schema) are practice-wide and stay visible to everyone who may read the Hub.
 */
export interface RegionScope {
  /** No row filter: a GLOBAL grant, or an action the actor holds globally. */
  all: boolean;
  /** Region list item ids of the actor's REGION grants. */
  regionIds: string[];
  /** Region values (hub names) of those ids. */
  regionValues: string[];
  /** Project ids inside the scope; empty when `all` is true. */
  projectIds: string[];
}

/** The Hub / Region list as both directions of the same map. */
export const regionLookup = cache(async (): Promise<{ byId: Map<string, string>; byValue: Map<string, string> }> => {
  const rows = await db
    .select({ id: listItem.id, value: listItem.value })
    .from(listItem)
    .where(eq(listItem.listKey, "region"))
    .orderBy(asc(listItem.sortOrder));
  return {
    byId: new Map(rows.map((r) => [r.id, r.value])),
    byValue: new Map(rows.map((r) => [r.value, r.id])),
  };
});

/** Region list item ids of every project, from the hubs of the people allocated to it. */
export const projectRegionIds = cache(async (): Promise<Map<string, string[]>> => {
  const [{ byValue }, rows] = await Promise.all([
    regionLookup(),
    db.select({ projectId: resourceRow.projectId, hub: resourceRow.hub }).from(resourceRow),
  ]);
  const out = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.projectId || !r.hub) continue;
    const id = byValue.get(r.hub.trim());
    if (!id) continue;
    const ids = out.get(r.projectId) ?? [];
    if (!ids.includes(id)) ids.push(id);
    out.set(r.projectId, ids);
  }
  return out;
});

/** The scope of one action for this actor: what may be read, and which regions may be written. */
export const scopeOf = cache(async (actor: Actor, action: Action): Promise<RegionScope> => {
  const scope = scopeFor(actor, action);
  if (scope.all || !scope.regionIds.length) {
    return { all: true, regionIds: scope.regionIds, regionValues: [], projectIds: [] };
  }
  const [{ byId }, byProject, projects] = await Promise.all([
    regionLookup(),
    projectRegionIds(),
    db.select({ id: project.id }).from(project),
  ]);
  const regionValues = scope.regionIds.map((id) => byId.get(id)).filter((v): v is string => Boolean(v));
  const projectIds = projects.map((p) => p.id).filter((id) => (byProject.get(id) ?? []).some((r) => scope.regionIds.includes(r)));
  return { all: false, regionIds: scope.regionIds, regionValues, projectIds };
});

/** True when a row of this project may be seen or changed under the scope. */
export function inScope(scope: RegionScope, projectId: string | null | undefined): boolean {
  if (scope.all) return true;
  // A row that belongs to no project is practice-wide, not another region's row.
  if (!projectId) return true;
  return scope.projectIds.includes(projectId);
}

/** The resource reference `can()` needs for a write on a row of this project. */
export async function regionRefOf(projectId: string | null | undefined): Promise<{ regionIds: string[] }> {
  if (!projectId) return { regionIds: [] };
  const byProject = await projectRegionIds();
  return { regionIds: byProject.get(projectId) ?? [] };
}
