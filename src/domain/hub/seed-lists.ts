import type { ListKey } from "@/domain/shared/enums";

/**
 * The Lists sheet of GIS_Practice_Hub.xlsx as shipped with the workbook. Used by the seed
 * (first start) and as the fallback when a workbook import carries no Lists sheet.
 * Order matters: it is the dropdown order.
 */
export interface SeedListItem {
  value: string;
  group?: string;
}

const INFRA = "Infrastructure";
const MP = "Masterplan";
const UP = "Urban Planning (U+P)";

export const SEED_LISTS: Record<ListKey, SeedListItem[]> = {
  designStage: [
    "MP - Masterplan",
    "PC - Pre-Concept",
    "CD - Concept Design",
    "SD - Schematic Design",
    "DD - Detailed Design",
    "PFD - Pre-Final Design",
    "FD - Final / Tender Design",
    "IFC - Issued for Construction",
    "CD 30% - Concept Design 30%",
    "CD 50% - Concept Design 50%",
    "CD 70% - Concept Design 70%",
    "CD 90% - Concept Design 90%",
    "DD 30% - Detailed Design 30%",
    "DD 50% - Detailed Design 50%",
    "DD 70% - Detailed Design 70%",
    "DD 90% - Detailed Design 90%",
  ].map((value) => ({ value })),
  projectStatus: ["Not Started", "Progressing", "At Risk", "On Hold", "Completed"].map((value) => ({ value })),
  packageStatus: [
    "Not Started",
    "In Progress",
    "Internal QA/QC",
    "Submitted",
    "Client Comments",
    "Resubmitted",
    "Approved",
    "On Hold",
    "Cancelled",
  ].map((value) => ({ value })),
  region: ["Dubai", "India", "Romania", "South Africa", "Mix EC Resources"].map((value) => ({ value })),
  discipline: [
    ...[
      "Roads & Highways",
      "Traffic & Transportation",
      "Grading & Earthworks",
      "Stormwater Drainage",
      "Sewer / Wastewater",
      "Potable Water",
      "Irrigation / TSE",
      "Fire Fighting Water",
      "District Cooling",
      "Gas",
      "Power / Electrical (MV/LV)",
      "Street Lighting",
      "Telecom / ICT",
      "Security",
      "Utility Corridors & Ducts",
      "Structures & Bridges",
      "Rail & Transit",
      "Marine & Coastal",
      "Geotechnical",
      "Topographic Survey",
      "Environmental",
      "Landscape & Hardscape",
      "Solid Waste",
    ].map((value) => ({ value, group: INFRA })),
    ...[
      "Masterplan - Land Use",
      "Masterplan - Plots & Parcels",
      "Masterplan - Zoning & Regulations",
      "Masterplan - Road Network",
    ].map((value) => ({ value, group: MP })),
    ...[
      "U+P - Urban Design",
      "U+P - Urban Planning",
      "U+P - Placemaking & Public Realm",
      "U+P - Open Space & Parks",
      "U+P - Socio-economic & Demographics",
      "U+P - Heritage & Cultural",
      "U+P - Sustainability & Climate",
    ].map((value) => ({ value, group: UP })),
    { value: "All Infrastructure Disciplines", group: INFRA },
  ],
  updateType: ["Accomplishment", "Priority (Next 2 Weeks)", "Concern"].map((value) => ({ value })),
  rag: ["Green", "Amber", "Red"].map((value) => ({ value })),
  dimension: ["2D", "3D", "2D & 3D"].map((value) => ({ value })),
  riskStatus: ["Open", "Monitoring", "Closed"].map((value) => ({ value })),
  standardStatus: ["Final", "Template", "Adopted", "In Development", "Under Review"].map((value) => ({ value })),
  innovationCategory: [
    "Standards & Procedures",
    "Automation & AI",
    "Platforms & Tools",
    "Training",
    "GIS-BIM Integration",
  ].map((value) => ({ value })),
  innovationStatus: ["Idea", "Planned", "In Progress", "Done"].map((value) => ({ value })),
  availability: ["Available", "Partially Available", "Fully Booked"].map((value) => ({ value })),
  workflowStatus: ["Completed", "In Progress", "Not Started"].map((value) => ({ value })),
  rfiStatus: ["Open", "Answered", "Closed"].map((value) => ({ value })),
  gisLead: ["Liliana Ignat", "Busisiwe Roberts", "Arun Belanke", "Safa Hamed", "Ahmed Elfatih"].map((value) => ({ value })),
  gisRole: [
    "GIS Manager",
    "GIS Lead",
    "Principal GIS Specialist",
    "Senior GIS Specialist",
    "GIS Specialist",
    "GIS Developer",
    "GIS Technician",
    "GIS Administrator",
    "GIS QA/QC Reviewer",
  ].map((value) => ({ value })),
  clientReviewStatus: [
    "Pending Submission",
    "Under Review",
    "Comments Issued",
    "Re-Submission Required",
    "Approved in Principle",
    "Approved",
  ].map((value) => ({ value })),
  revisionNo: ["R0", "R1", "R2", "R3", "R4", "R5"].map((value) => ({ value })),
  schemaStatus: ["Not Started", "In Progress", "Delivered", "Approved", "N/A"].map((value) => ({ value })),
  availabilityFlag: ["Available", "Unavailable"].map((value) => ({ value })),
  geometryType: ["Point", "Polyline", "Polygon", "Tabular", "Annotation", "Raster"].map((value) => ({ value })),
};

/** Default AECOM GIS delivery workflow (the band at the foot of the project update page). */
export const DEFAULT_WORKFLOW_STEPS = [
  "GIS Requirements (RFP / Client Standards)",
  "GIS Execution Plan & CRS Agreed",
  "Approved Design Data (Code B)",
  "CAD / BIM Data Cleaning",
  "Schema Mapping & Conversion",
  "Attribute Gaps / RFIs Issued",
  "QA/QC (Self-check + Independent)",
  "GIS Submission",
  "Client Review (CRS Comments)",
  "Comments Closure & Resubmission",
  "Client Approval",
  "Portal Publishing / Handover",
] as const;

/** First bi-weekly period of the workbook calendar and how many periods it holds. */
export const SEED_PERIOD_START = "2026-09-28";
export const SEED_PERIOD_COUNT = 80;
export const SEED_PERIOD_DAYS = 14;
