import { z } from "zod";
import {
  CHECK_RESULTS,
  DESIGN_STAGE_CODES,
  QAQC_CHECKS,
  QAQC_CHECK_LABELS,
  STAGE_STATES,
  UPDATE_TYPES,
  type ListKey,
} from "@/domain/shared/enums";
import type { Action } from "@/domain/authz/permissions";

/**
 * The registers of the Hub, one per sheet of the workbook, described as data: the columns in
 * sheet order with their type and dropdown source. Forms, validation, the workbook import,
 * the Excel export and the API all read this description, so a column exists in one place.
 */
export type FieldType = "text" | "textarea" | "date" | "select" | "number" | "int" | "pct" | "url" | "project";

export interface FieldDef {
  /** Column of the table (or key inside the jsonb column named by `json`). */
  key: string;
  /** Header of the sheet column. */
  label: string;
  type: FieldType;
  /** Dropdown source: a list of the Lists sheet, a fixed set, or the names of the Resources sheet. */
  list?: ListKey;
  options?: readonly string[];
  people?: boolean;
  /** Dropdowns accept typed values unless strict (the workbook's showErrorMessage=1). */
  strict?: boolean;
  required?: boolean;
  /** Stored inside this jsonb column. */
  json?: string;
  /** Packages: columns the GIS Specialist may edit without the plan permission. */
  progress?: boolean;
  /** Not editable: derived, shown read-only. */
  derived?: boolean;
  hint?: string;
}

export type RegisterKey =
  | "projects"
  | "packages"
  | "schema"
  | "resources"
  | "updates"
  | "risks"
  | "rfis"
  | "qaqc"
  | "standards"
  | "innovation";

export interface RegisterDef {
  key: RegisterKey;
  label: string;
  sheet: string;
  description: string;
  fields: FieldDef[];
  manage: Action;
  /** Packages only: the broader permission needed for non-progress columns. */
  plan?: Action;
  /** Column that names the row in messages and audit. */
  nameField: string;
  /** Natural key of a row for the workbook import (upsert). */
  naturalKey: string[];
  path: string;
}

const text = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: "text", ...extra });
const area = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: "textarea", ...extra });
const date = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: "date", ...extra });
const url = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: "url", ...extra });
const sel = (key: string, label: string, list: ListKey, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: "select", list, ...extra });
const person = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: "select", people: true, ...extra });
const project = (extra: Partial<FieldDef> = {}): FieldDef => ({ key: "projectId", label: "Project", type: "project", ...extra });

export const PROJECTS: RegisterDef = {
  key: "projects",
  label: "Projects",
  sheet: "Projects",
  path: "/projects",
  description: "One row per project - this is the master record. Green headers = you edit; dark headers = calculated automatically.",
  manage: "project:manage",
  nameField: "name",
  naturalKey: ["name"],
  fields: [
    text("name", "Project Name", { required: true }),
    text("client", "Client"),
    text("jobNo", "Job No."),
    sel("currentDesignStage", "Current Design Stage", "designStage"),
    sel("status", "Project Status", "projectStatus", { strict: true, required: true }),
    sel("gisLead", "GIS Lead", "gisLead"),
    ...DESIGN_STAGE_CODES.map((c) => ({ key: c, label: c, type: "select" as const, options: STAGE_STATES, strict: true, json: "stageStates" })),
    url("qaqcChecklistUrl", "Project QA/QC Checklist (paste URL)"),
    url("rfiLogUrl", "RFI Log (paste URL)"),
    { key: "crsOpen", label: "CRS Open", type: "int" },
    { key: "crsInReview", label: "CRS In Review", type: "int" },
    { key: "crsClosed", label: "CRS Closed", type: "int" },
    text("milestoneOverride", "Milestone Override (optional)"),
    date("lastUpdated", "Last Updated"),
    area("remarks", "Remarks"),
    url("dataShareFolderUrl", "GIS Data Share Folder (paste URL)"),
    { key: "latitude", label: "Latitude", type: "number", hint: "Map location (WGS 84)" },
    { key: "longitude", label: "Longitude", type: "number" },
    text("locationLabel", "Location"),
  ],
};

export const PACKAGES: RegisterDef = {
  key: "packages",
  label: "Packages",
  sheet: "Packages",
  path: "/packages",
  description: "One row per discipline package per design stage. Feeds GIS Delivered / Approved, GIS In Progress, submissions, milestones and the Delivery Tracker automatically.",
  manage: "package:progress",
  plan: "package:plan",
  nameField: "description",
  naturalKey: ["projectId", "designStage", "discipline", "description"],
  fields: [
    project({ required: true }),
    sel("designStage", "Design Stage", "designStage", { required: true }),
    sel("discipline", "Discipline", "discipline", { required: true, hint: "Pick one, or several separated by commas." }),
    text("description", "Package / Description"),
    sel("dimension", "Dimension", "dimension", { strict: true }),
    sel("status", "Status", "packageStatus", { strict: true, required: true, progress: true }),
    date("plannedSubmission", "Planned Submission"),
    date("actualSubmission", "Actual Submission"),
    date("approvalDate", "Approval Date"),
    { key: "progressPct", label: "Progress %", type: "pct", progress: true },
    person("assignedTo", "Assigned To"),
    area("remarks", "Remarks", { progress: true }),
    date("designApprovalDate", "Design Approval Date"),
    date("gisStartDate", "GIS Start Date", { progress: true }),
    sel("qaqcResult", "QA/QC Result", "rfiStatus", { options: CHECK_RESULTS, list: undefined }),
    sel("clientReviewStatus", "Client Review Status", "clientReviewStatus", { strict: true }),
    text("clientCommentRef", "Client Comment Ref."),
    sel("revisionNo", "Revision No.", "revisionNo"),
    date("resubmissionDate", "Re-Submission Date"),
  ],
};

export const SCHEMA: RegisterDef = {
  key: "schema",
  label: "Schema Tracker",
  sheet: "Schema Tracker",
  path: "/schema-tracker",
  description: "One row per feature class of the client schema. QIC rows are pre-loaded for every QIC project; add rows with the project name for other clients from their schema, dictionary, domains and subtypes.",
  manage: "schema:manage",
  nameField: "featureClass",
  naturalKey: ["projectLabel", "featureClass"],
  fields: [
    text("projectLabel", "Project", { required: true, hint: "Pick from the register, or keep \"QIC - all projects\" for the shared QIC schema." }),
    text("groupingAbbr", "Grouping Abbr"),
    text("groupingName", "Grouping Name"),
    text("featureClass", "Feature Class", { required: true }),
    text("featureClassAlias", "Feature Class Alias"),
    sel("geometryType", "Geometry Type", "geometryType"),
    sel("discipline", "Discipline", "discipline"),
    person("disciplineIndividual", "Discipline Individual"),
    sel("availability", "Available / Unavailable", "availabilityFlag", { strict: true }),
    area("gisComments", "GIS Comments"),
    sel("status", "Status", "schemaStatus", { strict: true }),
    area("notes", "Notes"),
    url("sourceFileUrl", "Source File Link (paste URL)"),
    url("shareFolderUrl", "Share Folder Link (paste URL)"),
  ],
};

export const RESOURCES: RegisterDef = {
  key: "resources",
  label: "Resources",
  sheet: "Resources",
  path: "/resources",
  description: "One row per person per project. The Hub here drives GIS Resources Region on the Projects register and the Dashboard, and every person dropdown.",
  manage: "resource:manage",
  nameField: "name",
  naturalKey: ["name", "projectId"],
  fields: [
    text("name", "Name", { required: true }),
    sel("role", "Role", "gisRole"),
    sel("hub", "Hub", "region", { strict: true }),
    project(),
    date("allocatedFrom", "Allocated From"),
    date("allocatedTo", "Allocated To"),
    { key: "plannedHours", label: "Planned Hrs (period)", type: "number" },
    { key: "actualHours", label: "Actual Hrs (period)", type: "number" },
    sel("availabilityNext", "Availability Next Period", "availability", { strict: true }),
    area("remarks", "Remarks"),
  ],
};

export const UPDATES: RegisterDef = {
  key: "updates",
  label: "Updates",
  sheet: "Updates",
  path: "/updates",
  description: "Written by the GIS lead of each region. One row per item. Shown in the three blocks of the project update page for the selected period.",
  manage: "update:manage",
  nameField: "description",
  naturalKey: ["projectId", "periodFrom", "type", "description"],
  fields: [
    date("meetingDate", "Meeting Date"),
    date("periodFrom", "Period From", { required: true }),
    date("periodTo", "Period To", { hint: "Blank = from + 13 days." }),
    project({ required: true }),
    { key: "type", label: "Type", type: "select", options: UPDATE_TYPES, strict: true, required: true },
    area("description", "Description", { required: true }),
    area("mitigation", "Mitigation (for Concerns)"),
    person("owner", "Owner"),
    date("dueDate", "Due Date"),
    sel("rag", "RAG", "rag", { strict: true }),
    person("enteredBy", "Entered By"),
    date("dateEntered", "Date Entered"),
  ],
};

export const RISKS: RegisterDef = {
  key: "risks",
  label: "Risks",
  sheet: "Risks",
  path: "/risks",
  description: "Only items needing a management decision or support. Routine issues stay in the project updates.",
  manage: "risk:manage",
  nameField: "title",
  naturalKey: ["title", "projectId"],
  fields: [
    area("title", "Risk / Issue", { required: true }),
    project(),
    area("impact", "Impact"),
    area("mitigation", "Mitigation / Action"),
    person("owner", "Owner"),
    text("supportNeededFrom", "Support Needed From"),
    date("dueDate", "Due Date"),
    sel("rag", "RAG", "rag", { strict: true }),
    sel("status", "Status", "riskStatus", { strict: true, required: true }),
    date("dateRaised", "Date Raised"),
  ],
};

export const RFIS: RegisterDef = {
  key: "rfis",
  label: "RFI Log",
  sheet: "RFI Log",
  path: "/rfis",
  description: "One row per RFI raised to a discipline or the client. Overdue and RAG are calculated; the counts flow to Projects, the Dashboard and the update pages.",
  manage: "rfi:manage",
  nameField: "rfiNo",
  naturalKey: ["rfiNo", "projectId"],
  fields: [
    text("rfiNo", "RFI No.", { required: true }),
    project(),
    sel("designStage", "Design Stage", "designStage"),
    sel("discipline", "Discipline", "discipline"),
    area("question", "Question / Information Requested"),
    person("raisedBy", "Raised By"),
    text("raisedTo", "Raised To"),
    date("dateRaised", "Date Raised"),
    date("dueDate", "Due Date"),
    area("response", "Response"),
    text("respondedBy", "Responded By"),
    date("responseDate", "Response Date"),
    sel("status", "Status", "rfiStatus", { strict: true, required: true }),
    area("remarks", "Remarks"),
  ],
};

export const QAQC: RegisterDef = {
  key: "qaqc",
  label: "QAQC",
  sheet: "QAQC",
  path: "/qaqc",
  description: "One checklist per package submission: eight checks, score and result calculated. Only a Pass goes to the client.",
  manage: "qaqc:manage",
  nameField: "packageSubmission",
  naturalKey: ["projectId", "designStage", "discipline", "packageSubmission"],
  fields: [
    project(),
    sel("designStage", "Design Stage", "designStage"),
    sel("discipline", "Discipline", "discipline"),
    text("packageSubmission", "Package / Submission", { required: true }),
    person("reviewer", "Reviewer"),
    date("reviewDate", "Review Date"),
    ...QAQC_CHECKS.map((c) => ({ key: c, label: QAQC_CHECK_LABELS[c], type: "select" as const, options: CHECK_RESULTS, strict: true, json: "checks" })),
    area("comments", "Comments"),
  ],
};

export const STANDARDS: RegisterDef = {
  key: "standards",
  label: "Standards",
  sheet: "Standards",
  path: "/standards",
  description: "GIS Practice standards library with links.",
  manage: "standard:manage",
  nameField: "title",
  naturalKey: ["title"],
  fields: [
    text("title", "Standard / Document", { required: true }),
    text("fileName", "File Name"),
    text("versionLabel", "Version"),
    sel("status", "Status", "standardStatus", { strict: true }),
    person("owner", "Owner"),
    area("purpose", "Purpose / When to Use"),
    url("url", "Link (paste URL)"),
  ],
};

export const INNOVATION: RegisterDef = {
  key: "innovation",
  label: "Innovation",
  sheet: "Innovation",
  path: "/innovation",
  description: "Practice development and innovation log.",
  manage: "innovation:manage",
  nameField: "initiative",
  naturalKey: ["initiative"],
  fields: [
    date("date", "Date"),
    sel("category", "Category", "innovationCategory", { strict: true }),
    text("initiative", "Initiative", { required: true }),
    area("description", "Description"),
    sel("status", "Status", "innovationStatus", { strict: true }),
    person("owner", "Owner"),
    area("benefit", "Benefit (time / quality / cost)"),
    url("url", "Link (paste URL)"),
  ],
};

export const REGISTERS: Record<RegisterKey, RegisterDef> = {
  projects: PROJECTS,
  packages: PACKAGES,
  schema: SCHEMA,
  resources: RESOURCES,
  updates: UPDATES,
  risks: RISKS,
  rfis: RFIS,
  qaqc: QAQC,
  standards: STANDARDS,
  innovation: INNOVATION,
};
export const REGISTER_KEYS = Object.keys(REGISTERS) as RegisterKey[];

/** Columns of a register that are plain table columns (not inside a jsonb). */
export function columnFields(def: RegisterDef): FieldDef[] {
  return def.fields.filter((f) => !f.json);
}

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal("")).transform((s) => (s ? s : null));
const isoDate = z.iso.date({ message: "Use the format YYYY-MM-DD." });
const optionalDate = isoDate.optional().or(z.literal("")).transform((s) => (s ? s : null));
const optionalNumber = z
  .union([z.number(), z.string().trim()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : NaN;
  })
  .refine((n) => n === null || !Number.isNaN(n), { message: "Enter a number." });

function fieldSchema(f: FieldDef): z.ZodType {
  switch (f.type) {
    case "text":
    case "select":
      return f.required ? z.string().trim().min(1, `${f.label} is required.`).max(500) : optionalText(500);
    case "textarea":
      return f.required ? z.string().trim().min(1, `${f.label} is required.`).max(4000) : optionalText(4000);
    case "url":
      return optionalText(2000);
    case "date":
      return f.required ? isoDate : optionalDate;
    case "number":
      return optionalNumber;
    case "int":
      return optionalNumber.transform((n) => (n === null ? 0 : Math.round(n)));
    case "pct":
      return optionalNumber
        .transform((n) => (n === null ? 0 : Math.round(n)))
        .refine((n) => n >= 0 && n <= 100, { message: "Progress is 0 to 100." });
    case "project":
      return f.required
        ? z.uuid({ message: "Pick a project." })
        : z.uuid().optional().or(z.literal("")).transform((s) => (s ? s : null));
  }
}

/** Zod schema of a register row built from its field definitions (jsonb sub-fields flattened). */
export function rowSchema(def: RegisterDef) {
  const shape: Record<string, z.ZodType> = {};
  for (const f of def.fields) if (!f.derived) shape[f.key] = fieldSchema(f);
  return z.object(shape);
}

/** Split a validated flat row into table columns and jsonb columns. */
export function splitJson(def: RegisterDef, flat: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of def.fields) {
    if (f.derived) continue;
    if (f.json) {
      const obj = (out[f.json] ??= {}) as Record<string, unknown>;
      if (flat[f.key] !== null && flat[f.key] !== undefined && flat[f.key] !== "") obj[f.key] = flat[f.key];
    } else {
      out[f.key] = flat[f.key];
    }
  }
  return out;
}

/** The reverse of splitJson for forms and exports. */
export function flattenRow(def: RegisterDef, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const f of def.fields) {
    if (f.json) out[f.key] = (row[f.json] as Record<string, unknown> | null | undefined)?.[f.key] ?? "";
  }
  return out;
}
