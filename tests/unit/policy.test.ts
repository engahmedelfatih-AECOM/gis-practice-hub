import { describe, expect, it } from "vitest";
import { ACTIONS, PERMISSIONS } from "@/domain/authz/permissions";
import { can, scopeFor, type Principal } from "@/domain/authz/policy";
import { ROLES, type Role } from "@/domain/shared/enums";

const R1 = "11111111-1111-4111-8111-111111111111";
const R2 = "22222222-2222-4222-8222-222222222222";

function principal(role: Role, regionId?: string): Principal {
  return {
    userId: "user",
    roles: [{ role, scopeType: regionId ? "REGION" : "GLOBAL", scopeId: regionId ?? null }],
  };
}

describe("permission matrix (GIS-STD-001 RACI)", () => {
  it("every action has at least one grant and Administrator may do everything", () => {
    for (const action of ACTIONS) {
      expect(PERMISSIONS[action].length, action).toBeGreaterThan(0);
      expect(can(principal("ADMINISTRATOR"), action), action).toBe(true);
    }
  });

  it.each(ROLES)("%s: `can` without a resource agrees with the matrix", (role) => {
    const p = principal(role);
    for (const action of ACTIONS) {
      const expected = PERMISSIONS[action].some((g) => g.role === role);
      expect(can(p, action), `${role} ${action}`).toBe(expected);
    }
  });

  it("a user with no roles can do nothing", () => {
    const p: Principal = { userId: "u", roles: [] };
    for (const action of ACTIONS) expect(can(p, action)).toBe(false);
  });

  it("Viewers read everything and manage nothing", () => {
    const v = principal("VIEWER");
    expect(can(v, "hub:read")).toBe(true);
    expect(can(v, "export:run")).toBe(true);
    for (const action of ACTIONS.filter((a) => a.endsWith(":manage") || a.startsWith("package:"))) {
      expect(can(v, action), action).toBe(false);
    }
  });

  it("the GIS Manager owns projects, lists and periods; the lead and specialist do not", () => {
    expect(can(principal("GIS_MANAGER"), "project:manage")).toBe(true);
    expect(can(principal("GIS_LEAD"), "project:manage")).toBe(false);
    expect(can(principal("GIS_SPECIALIST"), "list:manage")).toBe(false);
  });

  it("the lead plans packages and writes updates; the specialist reports progress only", () => {
    expect(can(principal("GIS_LEAD"), "package:plan")).toBe(true);
    expect(can(principal("GIS_LEAD"), "update:manage")).toBe(true);
    expect(can(principal("GIS_SPECIALIST"), "package:plan")).toBe(false);
    expect(can(principal("GIS_SPECIALIST"), "package:progress")).toBe(true);
    expect(can(principal("GIS_SPECIALIST"), "schema:manage")).toBe(true);
    expect(can(principal("GIS_SPECIALIST"), "update:manage")).toBe(false);
  });
});

describe("RACI change A9 (approved 2026-11-10)", () => {
  it("the QA/QC register is edited by the lead, the manager and the administrator, not the specialist", () => {
    expect(can(principal("GIS_LEAD"), "qaqc:manage")).toBe(true);
    expect(can(principal("GIS_MANAGER"), "qaqc:manage")).toBe(true);
    expect(can(principal("GIS_SPECIALIST"), "qaqc:manage")).toBe(false);
    expect(can(principal("VIEWER"), "qaqc:manage")).toBe(false);
  });

  it("the client schema is edited by the specialist and the manager, and only read by the lead", () => {
    expect(can(principal("GIS_SPECIALIST"), "clientSchema:manage")).toBe(true);
    expect(can(principal("GIS_MANAGER"), "clientSchema:manage")).toBe(true);
    expect(can(principal("GIS_LEAD"), "clientSchema:manage")).toBe(false);
    expect(can(principal("GIS_LEAD"), "hub:read")).toBe(true);
    expect(can(principal("VIEWER"), "clientSchema:manage")).toBe(false);
  });
});

describe("region scope", () => {
  it("a region-scoped lead edits rows of their region only", () => {
    const l = principal("GIS_LEAD", R1);
    expect(can(l, "package:plan", { regionId: R1 })).toBe(true);
    expect(can(l, "package:plan", { regionId: R2 })).toBe(false);
    expect(can(l, "package:plan")).toBe(true);
  });

  it("scopeFor narrows to the regions held, global grants see all", () => {
    expect(scopeFor(principal("GIS_LEAD", R1), "package:plan")).toEqual({ all: false, regionIds: [R1] });
    expect(scopeFor(principal("GIS_MANAGER"), "package:plan")).toEqual({ all: true, regionIds: [] });
    expect(scopeFor(principal("VIEWER"), "package:plan")).toEqual({ all: false, regionIds: [] });
  });
});
