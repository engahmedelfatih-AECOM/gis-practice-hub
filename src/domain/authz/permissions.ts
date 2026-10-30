import type { Role } from "@/domain/shared/enums";

/**
 * Every protected capability of the GIS Hub. Tests iterate this matrix, so it is
 * the one place the role-permission table of the working standard (GIS-STD-001,
 * section 3.5 RACI) is encoded.
 */
export const ACTIONS = [
  "hub:read",
  "project:manage",
  "package:plan",
  "package:progress",
  "schema:manage",
  "resource:manage",
  "update:manage",
  "risk:manage",
  "rfi:manage",
  "qaqc:manage",
  "standard:manage",
  "innovation:manage",
  "workflow:manage",
  "list:manage",
  "period:manage",
  "clientSchema:manage",
  "export:run",
  "user:read",
  "user:manage",
  "setting:read",
  "setting:manage",
  "audit:read",
  "apiKey:manage",
  "import:run",
] as const;
export type Action = (typeof ACTIONS)[number];

export interface Grant {
  role: Role;
}

const A = (role: Role): Grant => ({ role });
const EVERYONE: Grant[] = [
  A("ADMINISTRATOR"),
  A("GIS_MANAGER"),
  A("GIS_LEAD"),
  A("GIS_SPECIALIST"),
  A("VIEWER"),
];
const EDITORS: Grant[] = [A("ADMINISTRATOR"), A("GIS_MANAGER"), A("GIS_LEAD"), A("GIS_SPECIALIST")];
const LEADS: Grant[] = [A("ADMINISTRATOR"), A("GIS_MANAGER"), A("GIS_LEAD")];
const MANAGERS: Grant[] = [A("ADMINISTRATOR"), A("GIS_MANAGER")];
const ADMIN: Grant[] = [A("ADMINISTRATOR")];

export const PERMISSIONS: Record<Action, readonly Grant[]> = {
  "hub:read": EVERYONE,
  // Projects register and project update sheets: the GIS Manager (RACI R/A).
  "project:manage": MANAGERS,
  // Packages: plan, dates and client review by the lead; GIS start, progress and remarks by the specialist.
  "package:plan": LEADS,
  "package:progress": EDITORS,
  "schema:manage": EDITORS,
  "resource:manage": LEADS,
  "update:manage": LEADS,
  "risk:manage": EDITORS,
  "rfi:manage": EDITORS,
  "qaqc:manage": EDITORS,
  "standard:manage": MANAGERS,
  "innovation:manage": EDITORS,
  "workflow:manage": LEADS,
  "list:manage": MANAGERS,
  "period:manage": MANAGERS,
  "clientSchema:manage": EDITORS,
  "export:run": EVERYONE,
  "user:read": ADMIN,
  "user:manage": ADMIN,
  "setting:read": ADMIN,
  "setting:manage": ADMIN,
  "audit:read": ADMIN,
  "apiKey:manage": ADMIN,
  "import:run": ADMIN,
};
