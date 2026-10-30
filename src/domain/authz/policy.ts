import type { Role, ScopeType } from "@/domain/shared/enums";
import { PERMISSIONS, type Action } from "./permissions";

/** One active row of `role_assignment`, as seen by the policy. */
export interface RoleGrant {
  role: Role;
  scopeType: ScopeType;
  /** For REGION scope: the id of the region list item. */
  scopeId: string | null;
}

/** The authenticated principal. Built once per request by the application layer. */
export interface Principal {
  userId: string;
  roles: readonly RoleGrant[];
}

/** The resource a decision is about. Omit fields that do not apply. */
export interface ResourceRef {
  /** Region list item id of the row (the GIS Resources Region of a project, the hub of a person). */
  regionId?: string | null;
}

/**
 * Pure authorisation decision. No I/O. Returns true when at least one of the
 * principal's active role grants satisfies the action for the resource.
 *
 * Without a resource, `can` answers "may this user do this kind of thing at
 * all?" (used for navigation and list screens). Row-level narrowing for
 * region-scoped grants is done by `scopeFor()`.
 */
export function can(principal: Principal, action: Action, resource?: ResourceRef): boolean {
  for (const grant of PERMISSIONS[action]) {
    for (const held of principal.roles) {
      if (held.role !== grant.role) continue;
      if (held.scopeType === "GLOBAL") return true;
      if (!resource || resource.regionId === undefined) return true;
      if (resource.regionId === held.scopeId) return true;
    }
  }
  return false;
}

/** Row-level scope for list queries: `all: true` means no row filter is needed. */
export interface Scope {
  all: boolean;
  regionIds: string[];
}

export function scopeFor(principal: Principal, action: Action): Scope {
  const scope: Scope = { all: false, regionIds: [] };
  for (const grant of PERMISSIONS[action]) {
    for (const held of principal.roles) {
      if (held.role !== grant.role) continue;
      if (held.scopeType === "GLOBAL") return { all: true, regionIds: [] };
      if (held.scopeId) scope.regionIds.push(held.scopeId);
    }
  }
  scope.regionIds = Array.from(new Set(scope.regionIds));
  return scope;
}

export function hasRole(principal: Principal, role: Role): boolean {
  return principal.roles.some((r) => r.role === role);
}

export function isAdministrator(principal: Principal): boolean {
  return hasRole(principal, "ADMINISTRATOR");
}
