/**
 * Closed value sets shared by the domain, the database CHECK constraints and the UI.
 * Keep them here (not in the database as native enums) so adding a value is a
 * one-line code change plus a CHECK constraint migration.
 */
export const ROLES = ["ADMINISTRATOR", "GIS_MANAGER", "GIS_LEAD", "GIS_SPECIALIST", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

/** GLOBAL covers everything; REGION limits a GIS Lead to one hub (India, Romania, South Africa, Dubai). */
export const SCOPE_TYPES = ["GLOBAL", "REGION"] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];

/** Which scope types each role may be granted with. */
export const ROLE_SCOPES: Record<Role, readonly ScopeType[]> = {
  ADMINISTRATOR: ["GLOBAL"],
  GIS_MANAGER: ["GLOBAL"],
  GIS_LEAD: ["GLOBAL", "REGION"],
  GIS_SPECIALIST: ["GLOBAL", "REGION"],
  VIEWER: ["GLOBAL"],
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMINISTRATOR: "Administrator",
  GIS_MANAGER: "GIS Manager",
  GIS_LEAD: "GIS Lead",
  GIS_SPECIALIST: "GIS Specialist",
  VIEWER: "Viewer",
};

export const AUTH_PROVIDERS = ["LOCAL", "ENTRA"] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

/** The eight design stages of the Projects register (columns MP to IFC). */
export const DESIGN_STAGE_CODES = ["MP", "PC", "CD", "SD", "DD", "PFD", "FD", "IFC"] as const;
export type DesignStageCode = (typeof DESIGN_STAGE_CODES)[number];
export const DESIGN_STAGE_NAMES: Record<DesignStageCode, string> = {
  MP: "Masterplan",
  PC: "Pre-Concept",
  CD: "Concept Design",
  SD: "Schematic Design",
  DD: "Detailed Design",
  PFD: "Pre-Final Design",
  FD: "Final / Tender Design",
  IFC: "Issued for Construction",
};

/** State of one design stage on a project (the stage chips). */
export const STAGE_STATES = ["Approved", "In Progress", "Not Started", "N/A"] as const;
export type StageState = (typeof STAGE_STATES)[number];

/** The eight QA/QC checks of a checklist row, in sheet order. */
export const QAQC_CHECKS = [
  "crs",
  "schema",
  "topology",
  "attributes",
  "naming",
  "metadata",
  "format",
  "internalReview",
] as const;
export type QaqcCheck = (typeof QAQC_CHECKS)[number];
export const QAQC_CHECK_LABELS: Record<QaqcCheck, string> = {
  crs: "Coordinate System (CRS)",
  schema: "Schema",
  topology: "Topology",
  attributes: "Attributes",
  naming: "Naming",
  metadata: "Metadata",
  format: "Format",
  internalReview: "Internal Review",
};
export const CHECK_RESULTS = ["Pass", "Fail", "N/A"] as const;
export type CheckResult = (typeof CHECK_RESULTS)[number];

/** Dropdown lists of the Lists sheet. The key is stable; the label is the sheet heading. */
export const LIST_KEYS = {
  designStage: "Design Stages",
  projectStatus: "Project Status",
  packageStatus: "Package Status",
  region: "Hub / Region",
  discipline: "Discipline",
  updateType: "Update Type",
  rag: "RAG",
  dimension: "Dimension",
  riskStatus: "Risk Status",
  standardStatus: "Standard Status",
  innovationCategory: "Innovation Category",
  innovationStatus: "Innovation Status",
  availability: "Availability",
  workflowStatus: "Workflow Status",
  rfiStatus: "RFI Status",
  gisLead: "GIS Lead",
  gisRole: "GIS Role",
  clientReviewStatus: "Client Review Status",
  revisionNo: "Revision No.",
  schemaStatus: "Schema Status",
  availabilityFlag: "Schema Availability",
  geometryType: "Geometry Type",
} as const;
export type ListKey = keyof typeof LIST_KEYS;
export const LIST_KEY_VALUES = Object.keys(LIST_KEYS) as ListKey[];

/** Update types of the Updates sheet and the block of the update page they fill. */
export const UPDATE_TYPES = ["Accomplishment", "Priority (Next 2 Weeks)", "Concern"] as const;
export type UpdateType = (typeof UPDATE_TYPES)[number];
export const UPDATE_TYPE_BLOCKS: Record<UpdateType, string> = {
  Accomplishment: "Accomplishment / Progress",
  "Priority (Next 2 Weeks)": "Priorities / Planned (Next 2 Weeks)",
  Concern: "Concerns and Mitigations",
};

export const IMPORT_KINDS = ["HUB_WORKBOOK", "CLIENT_SCHEMA"] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];
export const IMPORT_STATUSES = ["RUNNING", "SUCCEEDED", "FAILED"] as const;
