import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { IMPORT_KINDS, IMPORT_STATUSES, LIST_KEY_VALUES } from "@/domain/shared/enums";
import { appUser } from "./auth";
import { inSet, timestamps, versionColumn } from "./_shared";

/**
 * The GIS Practice Hub registers. One table per sheet of GIS_Practice_Hub.xlsx with the
 * same columns, so the workbook import is a one-to-one mapping and the screens keep the
 * shape the team knows. Derived columns of the workbook (counts, next milestone, group,
 * overdue, score, period label) are not stored: domain/hub computes them.
 */

/** Lists sheet: one row per dropdown value. `group` carries the Discipline Group column. */
export const listItem = pgTable(
  "list_item",
  {
    id: uuid().primaryKey().defaultRandom(),
    listKey: text().notNull(),
    value: text().notNull(),
    group: text(),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("list_item_key_value_uq").on(t.listKey, t.value),
    check("list_item_key_chk", inSet(t.listKey, LIST_KEY_VALUES)),
  ],
);

/** Bi-weekly reporting periods (Lists sheet columns R to T). */
export const reportPeriod = pgTable(
  "report_period",
  {
    id: uuid().primaryKey().defaultRandom(),
    startDate: date().notNull(),
    endDate: date().notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("report_period_start_uq").on(t.startDate),
    check("report_period_range_chk", sql`${t.endDate} >= ${t.startDate}`),
  ],
);

/** Projects register: one row per project, the master record. */
export const project = pgTable(
  "project",
  {
    id: uuid().primaryKey().defaultRandom(),
    sortOrder: integer().notNull().default(0),
    name: text().notNull(),
    client: text(),
    jobNo: text(),
    /** The Project Number of the Resource Planner: the shared key between the two applications. Not in the workbook. */
    projectNumber: text(),
    currentDesignStage: text(),
    status: text().notNull().default("Not Started"),
    gisLead: text(),
    /** Stage chips MP to IFC: { MP: "Approved", ... }. */
    stageStates: jsonb().$type<Record<string, string>>().notNull().default({}),
    qaqcChecklistUrl: text(),
    rfiLogUrl: text(),
    /** Client comment (CRS) counters typed on the register: open, in review, closed. */
    crsOpen: integer().notNull().default(0),
    crsInReview: integer().notNull().default(0),
    crsClosed: integer().notNull().default(0),
    milestoneOverride: text(),
    lastUpdated: date(),
    remarks: text(),
    dataShareFolderUrl: text(),
    /** Map location (WGS 84). Not in the workbook; the Hub map uses it. */
    latitude: numeric({ precision: 9, scale: 6 }),
    longitude: numeric({ precision: 9, scale: 6 }),
    locationLabel: text(),
    ...versionColumn,
    ...timestamps,
  },
  (t) => [uniqueIndex("project_name_uq").on(t.name), uniqueIndex("project_number_uq").on(t.projectNumber), index("project_status_idx").on(t.status)],
);

/** Packages sheet: one row per discipline package per design stage. */
export const pkg = pgTable(
  "package",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    sortOrder: integer().notNull().default(0),
    designStage: text().notNull(),
    /** One discipline, or several separated by ", ". */
    discipline: text().notNull(),
    description: text(),
    dimension: text(),
    status: text().notNull().default("Not Started"),
    plannedSubmission: date(),
    actualSubmission: date(),
    approvalDate: date(),
    /** Blank in the workbook stays null (the tracker averages filled cells only). */
    progressPct: integer(),
    assignedTo: text(),
    remarks: text(),
    designApprovalDate: date(),
    gisStartDate: date(),
    qaqcResult: text(),
    clientReviewStatus: text(),
    clientCommentRef: text(),
    revisionNo: text(),
    resubmissionDate: date(),
    ...versionColumn,
    ...timestamps,
  },
  (t) => [
    index("package_project_idx").on(t.projectId, t.sortOrder),
    check("package_progress_chk", sql`${t.progressPct} between 0 and 100`),
  ],
);

/** Schema Tracker sheet: one row per feature class of the client schema per project. */
export const schemaFeature = pgTable(
  "schema_feature",
  {
    id: uuid().primaryKey().defaultRandom(),
    sortOrder: integer().notNull().default(0),
    /** The Project column as typed ("QIC - all projects" or a project name). */
    projectLabel: text().notNull(),
    projectId: uuid().references(() => project.id, { onDelete: "set null" }),
    groupingAbbr: text(),
    groupingName: text(),
    featureClass: text().notNull(),
    featureClassAlias: text(),
    geometryType: text(),
    discipline: text(),
    disciplineIndividual: text(),
    availability: text(),
    gisComments: text(),
    status: text(),
    notes: text(),
    sourceFileUrl: text(),
    shareFolderUrl: text(),
    ...versionColumn,
    ...timestamps,
  },
  (t) => [index("schema_feature_project_idx").on(t.projectLabel, t.sortOrder)],
);

/** Resources sheet: one row per person per project. */
export const resourceRow = pgTable(
  "resource_row",
  {
    id: uuid().primaryKey().defaultRandom(),
    sortOrder: integer().notNull().default(0),
    name: text().notNull(),
    role: text(),
    hub: text(),
    projectId: uuid().references(() => project.id, { onDelete: "set null" }),
    allocatedFrom: date(),
    allocatedTo: date(),
    plannedHours: numeric({ precision: 8, scale: 2 }),
    actualHours: numeric({ precision: 8, scale: 2 }),
    /** Utilisation % typed from the workbook dropdown (0 to 120). */
    utilisationPct: integer(),
    availabilityNext: text(),
    remarks: text(),
    ...versionColumn,
    ...timestamps,
  },
  (t) => [
    index("resource_row_project_idx").on(t.projectId),
    index("resource_row_name_idx").on(t.name),
    check("resource_row_utilisation_chk", sql`${t.utilisationPct} between 0 and 120`),
  ],
);

/** Updates sheet: accomplishments, priorities and concerns per project and period. */
export const updateItem = pgTable(
  "update_item",
  {
    id: uuid().primaryKey().defaultRandom(),
    sortOrder: integer().notNull().default(0),
    meetingDate: date(),
    periodFrom: date().notNull(),
    periodTo: date(),
    projectId: uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    type: text().notNull(),
    description: text().notNull(),
    mitigation: text(),
    owner: text(),
    dueDate: date(),
    rag: text(),
    enteredBy: text(),
    dateEntered: date(),
    ...versionColumn,
    ...timestamps,
  },
  (t) => [index("update_item_project_period_idx").on(t.projectId, t.periodFrom)],
);

/** Risks sheet. */
export const risk = pgTable(
  "risk",
  {
    id: uuid().primaryKey().defaultRandom(),
    sortOrder: integer().notNull().default(0),
    title: text().notNull(),
    projectId: uuid().references(() => project.id, { onDelete: "set null" }),
    impact: text(),
    mitigation: text(),
    owner: text(),
    supportNeededFrom: text(),
    dueDate: date(),
    rag: text(),
    status: text().notNull().default("Open"),
    dateRaised: date(),
    ...versionColumn,
    ...timestamps,
  },
  (t) => [index("risk_project_idx").on(t.projectId), index("risk_status_idx").on(t.status)],
);

/** RFI Log sheet. */
export const rfi = pgTable(
  "rfi",
  {
    id: uuid().primaryKey().defaultRandom(),
    sortOrder: integer().notNull().default(0),
    /** Calculated in the workbook ("RFI-001" per project); kept for files imported earlier. */
    rfiNo: text(),
    projectId: uuid().references(() => project.id, { onDelete: "set null" }),
    designStage: text(),
    discipline: text(),
    question: text(),
    raisedBy: text(),
    raisedTo: text(),
    dateRaised: date(),
    dueDate: date(),
    response: text(),
    respondedBy: text(),
    responseDate: date(),
    /** Blank is allowed (workbook): a blank RFI is neither open nor closed. */
    status: text(),
    remarks: text(),
    ...versionColumn,
    ...timestamps,
  },
  (t) => [index("rfi_project_idx").on(t.projectId), index("rfi_status_idx").on(t.status)],
);

/** QAQC sheet: one checklist per package submission; `checks` holds the eight results. */
export const qaqcChecklist = pgTable(
  "qaqc_checklist",
  {
    id: uuid().primaryKey().defaultRandom(),
    sortOrder: integer().notNull().default(0),
    projectId: uuid().references(() => project.id, { onDelete: "set null" }),
    designStage: text(),
    discipline: text(),
    packageSubmission: text(),
    reviewer: text(),
    reviewDate: date(),
    checks: jsonb().$type<Record<string, string>>().notNull().default({}),
    comments: text(),
    ...versionColumn,
    ...timestamps,
  },
  (t) => [index("qaqc_project_idx").on(t.projectId)],
);

/** Standards sheet. */
export const standardItem = pgTable("standard_item", {
  id: uuid().primaryKey().defaultRandom(),
  sortOrder: integer().notNull().default(0),
  title: text().notNull(),
  fileName: text(),
  versionLabel: text(),
  status: text(),
  owner: text(),
  purpose: text(),
  url: text(),
  ...versionColumn,
  ...timestamps,
});

/** Innovation sheet. */
export const innovationItem = pgTable("innovation_item", {
  id: uuid().primaryKey().defaultRandom(),
  sortOrder: integer().notNull().default(0),
  date: date(),
  category: text(),
  initiative: text().notNull(),
  description: text(),
  status: text(),
  owner: text(),
  benefit: text(),
  url: text(),
  ...versionColumn,
  ...timestamps,
});

/** "GIS Enterprise Applications" box of the project update page. */
export const enterpriseApp = pgTable(
  "enterprise_app",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    sortOrder: integer().notNull().default(0),
    name: text().notNull(),
    url: text(),
    ...timestamps,
  },
  (t) => [index("enterprise_app_project_idx").on(t.projectId)],
);

/** Delivery workflow band of the project update page: steps with a status, per project. */
export const workflowStep = pgTable(
  "workflow_step",
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    stepNo: integer().notNull(),
    name: text().notNull(),
    status: text().notNull().default("Not Started"),
    ...timestamps,
  },
  (t) => [uniqueIndex("workflow_step_project_no_uq").on(t.projectId, t.stepNo)],
);

/** Client schema (one per Master Tracker workbook, for example QIC). */
export const clientSchema = pgTable(
  "client_schema",
  {
    id: uuid().primaryKey().defaultRandom(),
    clientName: text().notNull(),
    projectLabel: text(),
    gisLead: text(),
    schemaVersion: text(),
    notes: text(),
    ...versionColumn,
    ...timestamps,
  },
  (t) => [uniqueIndex("client_schema_name_uq").on(t.clientName)],
);

/** Master Tracker sheet of a client schema. */
export const clientFeatureClass = pgTable(
  "client_feature_class",
  {
    id: uuid().primaryKey().defaultRandom(),
    clientSchemaId: uuid()
      .notNull()
      .references(() => clientSchema.id, { onDelete: "cascade" }),
    sortOrder: integer().notNull().default(0),
    groupingAbbr: text(),
    groupingName: text(),
    featureClass: text().notNull(),
    featureClassAlias: text(),
    geometryType: text(),
    discipline: text(),
    disciplineIndividual: text(),
    availability: text(),
    gisComments: text(),
    status: text(),
    notes: text(),
    sourceFileUrl: text(),
    shareFolderUrl: text(),
    ...versionColumn,
    ...timestamps,
  },
  (t) => [uniqueIndex("client_feature_class_uq").on(t.clientSchemaId, t.featureClass)],
);

/** Dictionary sheet: every field of every feature class. */
export const clientField = pgTable(
  "client_field",
  {
    id: uuid().primaryKey().defaultRandom(),
    clientSchemaId: uuid()
      .notNull()
      .references(() => clientSchema.id, { onDelete: "cascade" }),
    sortOrder: integer().notNull().default(0),
    grouping: text(),
    featureClass: text().notNull(),
    geometryType: text(),
    fieldName: text().notNull(),
    fieldAlias: text(),
    description: text(),
    esriType: text(),
    textLength: integer(),
    numericPrecision: integer(),
    numericScale: integer(),
    domainHint: text(),
    nullable: text(),
    defaultValue: text(),
    units: text(),
  },
  (t) => [index("client_field_fc_idx").on(t.clientSchemaId, t.featureClass)],
);

/** Subtypes sheet. */
export const clientSubtype = pgTable(
  "client_subtype",
  {
    id: uuid().primaryKey().defaultRandom(),
    clientSchemaId: uuid()
      .notNull()
      .references(() => clientSchema.id, { onDelete: "cascade" }),
    sortOrder: integer().notNull().default(0),
    featureClass: text().notNull(),
    code: text(),
    name: text(),
  },
  (t) => [index("client_subtype_fc_idx").on(t.clientSchemaId, t.featureClass)],
);

/** Domains sheet. */
export const clientDomain = pgTable(
  "client_domain",
  {
    id: uuid().primaryKey().defaultRandom(),
    clientSchemaId: uuid()
      .notNull()
      .references(() => clientSchema.id, { onDelete: "cascade" }),
    sortOrder: integer().notNull().default(0),
    domainName: text().notNull(),
    domainType: text(),
    domainValues: text(),
  },
  (t) => [index("client_domain_idx").on(t.clientSchemaId, t.domainName)],
);

/** Workbook imports run from Administration > Import. */
export const importRun = pgTable(
  "import_run",
  {
    id: uuid().primaryKey().defaultRandom(),
    kind: text().notNull(),
    fileName: text().notNull(),
    dryRun: boolean().notNull().default(false),
    status: text().notNull().default("RUNNING"),
    summary: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    error: text(),
    startedBy: uuid()
      .notNull()
      .references(() => appUser.id),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index("import_run_started_idx").on(t.startedAt),
    check("import_run_kind_chk", inSet(t.kind, IMPORT_KINDS)),
    check("import_run_status_chk", inSet(t.status, IMPORT_STATUSES)),
  ],
);
