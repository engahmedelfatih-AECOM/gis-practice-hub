# Workbook mapping - GIS_Practice_Hub.xlsx to the GIS Hub application

The workbook is the specification. Every sheet is a register of the application with the same
columns, the same dropdowns and the same automations. This page is the mapping, kept current
with `src/domain/hub/registers.ts` (columns) and `src/domain/hub/rules.ts` (formulas).

## Sheets to screens

| Sheet                                   | Screen                             | Table                  | Notes                                                                               |
| --------------------------------------- | ---------------------------------- | ---------------------- | ----------------------------------------------------------------------------------- |
| Home                                    | navigation                         | -                      | The left navigation lists the sheets in the Home order.                            |
| Dashboard                               | `/` Dashboard                      | derived                | KPI tiles, status table, status chart, projects map (new).                          |
| Project update sheets (one per project) | `/projects/[id]`                   | derived                | Built per period; nothing typed except the applications box and the workflow steps. |
| Report Template                         | -                                  | -                      | Every project gets its page automatically.                                          |
| Projects                                | `/projects`                        | `project`              | Stage chips MP to IFC in `stage_states`; CRS counters typed; location for the map; Project Number (Hub only, the key shared with the Resource Planner).  |
| Packages                                | `/packages`                        | `package`              | Delivery columns included; Discipline Group and Days Overdue calculated.            |
| Delivery Tracker                        | `/delivery-tracker?project=`       | derived                | Laheq layout, one project, Excel and PDF export.                                    |
| Schema Tracker                          | `/schema-tracker`                  | `schema_feature`       | Project column kept as text; linked to the project when the name matches.           |
| Resources                               | `/resources`                       | `resource_row`         | Utilisation % and GIS Resources Region calculated.                                  |
| Updates                                 | `/updates`                         | `update_item`          | Meeting Date, Period From, Period To; Report Period and the standard period derived.|
| Risks                                   | `/risks`                           | `risk`                 |                                                                                     |
| RFI Log                                 | `/rfis`                            | `rfi`                  | Overdue and RAG calculated.                                                         |
| QAQC                                    | `/qaqc`                            | `qaqc_checklist`       | Eight checks in `checks`; Score and Result calculated.                              |
| Standards                               | `/standards`                       | `standard_item`        |                                                                                     |
| Innovation                              | `/innovation`                      | `innovation_item`      |                                                                                     |
| Lists                                   | `/admin/lists`, `/admin/periods`   | `list_item`, `report_period` | Dropdown sources and the bi-weekly calendar.                                  |
| Master Tracker workbook (per client)    | `/client-schemas`                  | `client_*`             | Master Tracker, Dictionary, Subtypes, Domains.                                      |

## Formulas replaced (domain/hub/rules.ts)

| Workbook                                     | Function              | Rule                                                                                   |
| -------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------- |
| Packages: Discipline Group                   | `disciplineGroup`     | Group of the discipline, of the first one when several, else "Multiple".               |
| Projects: GIS Delivered / Approved           | `deliveredText`       | Submitted, Resubmitted, Approved packages as "Stage Discipline (Dim) - Status".         |
| Projects: GIS In Progress                    | `inProgressText`      | Not Started, In Progress, Internal QA/QC, Client Comments, On Hold packages.            |
| Projects: Next Milestone and date            | `nextMilestone`       | Override when typed, else the earliest planned submission not yet approved.            |
| Projects: Submissions This Period            | `submissionsInPeriod` | Actual submissions inside the selected period.                                         |
| Projects: RFI Open / Closed / Total          | `rfiCounts`           | From the RFI Log status column.                                                        |
| Projects: GIS Resources Region               | `resourcesRegion`     | More than one EC hub = Mix EC Resources; one EC hub = that hub; Dubai alone = Dubai.    |
| Projects: Utilisation %                      | `projectUtilisation`  | Average of the resources' actual over planned hours.                                   |
| Delivery Tracker: Days Overdue               | `daysOverdue`         | Without actual: days past planned; with actual: days actual was later than planned.    |
| Delivery Tracker: totals and overall progress| `deliverySummary`     | Counts per status, average progress.                                                   |
| RFI Log: Overdue, RAG                        | `rfiOverdue`, `rfiRag`| Open past due = overdue (Red); Closed = Green; otherwise Amber.                         |
| QAQC: Score, Result                          | `qaqcScore`           | Passes over applicable checks; Fail if any check failed.                               |
| Resources: Utilisation %                     | `utilisation`         | Actual over planned.                                                                   |
| Updates: Report Period, bucket               | `periodLabel`, `periodBucket` | Label from the two dates; the standard period containing Period From.          |
| Dashboard tiles                              | `dashboardKpis`       | Totals by status, submissions, open CRS, open and overdue RFIs, utilisation, risks.     |

## Dropdowns

Strict lists (the workbook rejects typed values): Project Status, Package Status, Dimension,
Progress %, Client Review Status, Availability, Schema Status, RAG, Risk Status, RFI Status,
Standard Status, Innovation Category and Status, Hub / Region, the stage states and the QA/QC
check results. Every other dropdown accepts a typed value, as the workbook does.

People dropdowns (Assigned To, Owner, Reviewer, Entered By, Raised By, Discipline Individual)
read the names of the Resources register, exactly like the workbook reads the Resources sheet.

## What the application adds

- Date pickers on every date (the browser calendar).
- A projects map (MapLibre, OpenStreetMap tiles by default, style URL configurable).
- Role based editing per the working standard (GIS Manager, GIS Lead, GIS Specialist, Viewer).
- Audit history on every row, optimistic locking, idempotent workbook import with dry run.
- Excel export of every register, Excel and PDF export of the update page and the tracker.
- A read-only JSON feed for the Resource Planner (`/api/hub/v1/...`, API key).
