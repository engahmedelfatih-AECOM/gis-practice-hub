# Handover - P10 System and Development: GIS Resource Planner and GIS Practice Hub

Prepared on 2026-11-02 for the Claude Project "P10 System & Development". Written from the two
checked-out repositories (`resource-planner` on branch `split-planner` at dae1498, `gis-practice-hub`
on branch `main` at 13d9a35), the Render dashboard as read through the Render connector, and the
conversation history of the building session. Anything not confirmed from one of those sources is
marked [VERIFY]. No secret appears in this file; every credential is referenced by its environment
variable name only.

Owner: Ahmed Elfatih, GIS Manager, AECOM Middle East GIS Practice (work e-mail
ahmed.elfatih@aecom.com; GitHub organisation account engahmedelfatih-AECOM).

---

## 1. Executive summary

- Two web applications exist for the AECOM Middle East GIS Practice, both built with the same
  stack (Next.js 16, React 19, PostgreSQL 16, Drizzle, Better Auth, Tailwind 4 with the AECOM colour
  tokens) and the same layered architecture enforced by ESLint.
- **GIS Resource Planner** (repository `engahmedelfatih-AECOM/resource-planner`): staff, teams,
  capacity, allocations, resource requests and approvals, leave and public holidays, bids with the
  proposal cost calculator, rate card and budget monitoring, hours review, reports and exports.
  Demo: https://resource-planner-minr.onrender.com (Render service `resource-planner`).
- **GIS Practice Hub** (repository `engahmedelfatih-AECOM/gis-practice-hub`): the workbook
  `GIS_Practice_Hub.xlsx` as an application. Projects, packages, delivery tracker, schema tracker,
  resources, bi-weekly updates, risks, RFI log, QA/QC checklists, standards, innovation, client
  Master Trackers (dictionary, subtypes, domains), dashboard with map, project update page for the
  progress meeting, admin lists, report periods, workbook import, exports, API feed.
  Demo: https://gis-practice-hub.onrender.com (Render service `gis-practice-hub`).
- History in one paragraph: the Hub was first built as a module inside the Resource Planner
  (planner branches hub-phase-a to hub-phase-e, PRs 1 to 5). On 2026-10-30 the owner decided the
  Hub must be a separate application that mirrors the Excel workbook one to one; the Hub was
  rebuilt as its own repository and the planner was cleaned on branch `split-planner` (PR #8,
  migration 0010 drops the hub tables). PR #8 is not yet merged at the time of writing.
- Status today: Hub deployed and live on Render with admin seeded, lists (144 values) and
  80 bi-weekly report periods loaded, demo accounts created, no workbook imported yet. Planner
  demo is live on Render from `main`, which still contains Hub Phase A code and tables until PR #8
  is merged and the data wipe is run.
- The Excel workbooks (`GIS_Practice_Hub_v5.xlsx`, delivered to the team as `GIS_Practice_Hub.xlsx`,
  and `QIC_Master_Tracker_AECOM.xlsx`) remain the team's working tools and the specification of the
  Hub. The working standard GIS-STD-001 (Word, PowerPoint, Markdown) describes who fills what.

---

## 2. Repository and environment

### 2.1 Repositories

| Item | GIS Resource Planner | GIS Practice Hub |
| --- | --- | --- |
| GitHub | `engahmedelfatih-AECOM/resource-planner` | `engahmedelfatih-AECOM/gis-practice-hub` |
| Default branch | `main` (head 0a05572, merge of hub-phase-a) | `main` (head 13d9a35) |
| Work branch | `split-planner` (head dae1498, PR #8 open to main) | none, work on main |
| Local checkout in the building session | `/home/user/resource-planner` | `/home/user/gis-practice-hub` |
| Project rules file | `CLAUDE.md`, plus `AGENTS.md` (Next.js 16 notes) | `CLAUDE.md` |
| Render service | `resource-planner`, id `srv-dbbmnsrncjis7398i680`, Frankfurt, free plan, Docker, auto-deploy on commit from `main` (confirmed through the Render connector on 2026-11-02) | `gis-practice-hub`, id `srv-dbihdu08v5cc73a9lmt0`, Frankfurt, free plan, Docker, auto-deploy from `main` |
| Render URL | https://resource-planner-minr.onrender.com | https://gis-practice-hub.onrender.com |
| Render database | `resource-planner-db`, id `dpg-dbbmmi0ae00c739b8bb0-a`, PostgreSQL 16, free plan | none of its own: database `gis_practice_hub` created on the `resource-planner-db` instance (shared-instance mode, see 2.4) |
| Render workspace | "Ahmed Workspase" (sic), id `tea-daki00142hec73al8o90` | same |
| CI | GitHub Actions `.github/workflows/ci.yml` | GitHub Actions `.github/workflows/ci.yml` |

Open pull requests on `resource-planner` (as last seen; `gh pr list` could not be re-run from the
handover session, so [VERIFY]):

| PR | Branch | Content | Action |
| --- | --- | --- | --- |
| #2, #3, #4, #5 | hub-phase-b to hub-phase-e (stacked) | Hub inside the planner | Superseded by #8, which contains their history. Close after #8 merges. |
| #6 | portal push hardening | ArcGIS Portal push job hardening | Obsolete (portal push retired). Close. |
| #7 | brand-standards | `standards/templates` folder: AECOM_PPT_Template.pptx, logo variants, brand standards | Still wanted. Rebase on main after #8 and merge [VERIFY conflicts]. |
| #8 | split-planner | Remove Hub from the planner, wordmark, public holidays, data wipe script, docs, ADR-008 | Merge first. CI was green at dae1498. |

### 2.2 Stack (identical in both unless noted)

- Node 22 (CI uses `actions/setup-node` with node-version 22), npm, TypeScript 5.
- Next.js 16.4.2 App Router with server actions, React 19.3.0, `server-only`.
- PostgreSQL 16, `postgres` 3.4.9 driver, Drizzle ORM 0.45.4 with `casing: "snake_case"`, Drizzle Kit
  0.31.11, SQL migrations under `db/migrations` applied by `scripts/migrate.ts`.
- Better Auth 1.7.11: e-mail and password accounts, optional Microsoft Entra ID (generic OAuth2
  provider `microsoft-entra-id`). Planner cookie prefix `rp` and `appName` "Resource Planner", Hub cookie prefix `gh` and
  `appName` "GIS Hub".
- Tailwind 4 with the AECOM tokens in `src/app/globals.css` (Earth Green primary, palette tints
  such as `sunrise-yellow-25`), Arial, Radix UI primitives, lucide-react icons, class-variance-authority.
- zod 4.6.7 for validation, date-fns 4, pino 10 logging, exceljs for Excel, pdf-lib for PDF.
- Planner only: nodemailer 10.1.7 (e-mail outbox and SMTP flush).
- Hub only: maplibre-gl ^5.5.0 (projects map, OpenStreetMap raster tiles by default, style URL
  configurable; the Content Security Policy allows the tile hosts listed in `MAP_ORIGINS`).
- Tests: Vitest 5.0.5 (projects `unit` and `integration`), Playwright 1.64.1 (end-to-end against a
  production build). Prettier with the Tailwind plugin. ESLint 9 with `eslint-plugin-boundaries`.
- Container: multi-stage Dockerfile producing a Next.js standalone build; `docker-entrypoint.sh`
  runs migrations, seed and demo accounts on every start (all idempotent). The Hub Dockerfile also
  bundles `scripts/ensure-db.ts` with esbuild for the shared-instance mode.

### 2.3 Layered architecture (both repositories)

ESLint boundaries: `src/domain` (pure rules, enums, zod schemas, no imports from other layers),
`src/application` (use cases, services, server actions helpers; imports domain and infrastructure),
`src/infrastructure` (database schema and client, auth, mail, logging), `src/components` (UI, may
import only domain types and `lib`), `src/app` (routes, server actions, pages), `src/lib`
(formatting and helpers). Components must not import from application or infrastructure; when a
component needs a shape from a service it declares a local interface.

### 2.4 Environment variables (names only)

Planner (`.env.example`): `DATABASE_URL`, `APP_URL`, `BETTER_AUTH_SECRET`, `LOG_LEVEL`,
`SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD`, `MS_TENANT_ID`, `MS_CLIENT_ID`,
`MS_CLIENT_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `MAIL_FROM`,
`JOB_TOKEN`; `render.yaml` also sets `BETTER_AUTH_URL`; the entrypoint reads `DEMO_ACCOUNTS_PASSWORD`.

Hub: `DATABASE_URL`, `HUB_DATABASE_NAME`, `APP_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`,
`LOG_LEVEL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD`, `DEMO_ACCOUNTS_PASSWORD`,
`MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `JOB_TOKEN`, `MAP_ORIGINS`, `NODE_ENV`.

Values set on the Hub Render service (through the Render connector and the dashboard):
`HUB_DATABASE_NAME=gis_practice_hub`, `APP_URL` and `BETTER_AUTH_URL` = the onrender URL,
`SEED_ADMIN_EMAIL=ahmed.elfatih@aecom.com` (changed after first boot, so it had no effect on the
already seeded admin, see section 10), `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD`,
`DEMO_ACCOUNTS_PASSWORD`, `BETTER_AUTH_SECRET`, `JOB_TOKEN`, `LOG_LEVEL=info`,
`NODE_ENV=production`, and `DATABASE_URL` = internal connection string of `resource-planner-db`
(added by the owner in the dashboard). The seeded admin and demo passwords were given to the owner
in chat only and are not recorded anywhere in the repositories.

Shared-instance mode (Hub): Render's free tier allows one free PostgreSQL per workspace and the
second `create_postgres` call was refused. `scripts/ensure-db.ts` runs at boot: when
`HUB_DATABASE_NAME` is set and differs from the database in `DATABASE_URL`, it creates that database
on the same instance if missing and rewrites the URL for the application. Data stays in a separate
database with its own tables and migrations. To move the Hub to its own instance later: set
`DATABASE_URL` to the new database and remove `HUB_DATABASE_NAME`.

### 2.5 Local development

```bash
# both repositories
npm ci
docker compose up -d        # PostgreSQL 16 on 127.0.0.1:5433 (planner: rp_dev, tests use rp_test; hub: gh_dev, gh_test)
cp .env.example .env.local  # set BETTER_AUTH_SECRET and SEED_ADMIN_*
npm run db:migrate && npm run db:seed
npm run dev                 # http://localhost:3000
npm run lint && npm run typecheck && npm run test:unit
npm run test:int            # needs the *_test database
npm run test:e2e            # production build on port 3100, seeded database (gh_e2e for the hub)
```

In the building session a local cluster was run with `pg_ctl` (data dir in the scratchpad, port 5433)
instead of Docker; manual Playwright runs used port 3110 to avoid clashing with the dev server.

---

## 3. Data model

### 3.1 GIS Resource Planner (after PR #8, migrations 0000 to 0010)

Authentication and access: Better Auth tables with the `auth_` prefix (`auth_user`, `auth_session`,
`auth_account`, `auth_verification`, `auth_rate_limit`; see `src/infrastructure/db/schema/auth.ts`),
`app_user` (profile, active flag, employee link), `role_assignment` (role plus scope type GLOBAL,
DISCIPLINE or TEAM), `api_key`
(hashed keys for the hub feed), `audit_log` (append-only, trigger blocks update and delete),
`notification`, `email_outbox`, `app_setting`, `pick_list_item`, `import_run`, `workflow_event`.

Organisation and people: `discipline`, `team` (region teams), `staff_role`, `employee`
(name, e-mail, grade, staff role, team, office, cost rate fields, start and end dates),
`employee_working_pattern`, `holiday_calendar`, `public_holiday`, `leave`, `client`.

Projects and planning: `project` (projectNumber, name, clientId, status, projectType, jobNumber,
externalProjectManager, leadName, leadUserId, hubUrl, qaqcChecklistUrl, rfiLogUrl, startDate,
endDate, office, description, gisLeadUserId, regionTeamId, scopeNote, remarks, budgetAed,
budgetSource, budgetSetBy, budgetSetAt, externalRef), `project_member`, `project_stage`,
`stage_type`, `sub_stage_type`, `allocation_profile`, `allocation_period`, `resource_allocation`,
`allocation_actual`, `allocation_week_unlock`, `resource_request`, `resource_request_period`.

Bids and cost calculator: `bid`, `bid_status_event`, `bid_file`, `bid_calculator`,
`bid_calc_stage`, `bid_calc_role`, `bid_calc_effort`, `calc_role_catalog`, `calc_location`,
`calc_effort_factor`.

Budget: `rate_card`, `project_budget_history`, `budget_alert`.

Migrations: 0000_init, 0001_constraints, 0002_gis_planning, 0003_planning_constraints,
0004_phase4_integration, 0005_hub_phase_a to 0009_hub_phase_e (hub tables, now dropped),
0010_split_planner, which drops the in-planner hub tables `design_discipline`, `generated_report`,
`innovation_item`, `project_app`, `project_discipline`, `project_update`, `risk`, `standard`,
`tracker_document`, `tracker_revision`, `tracker_row`, `workflow_step`, `portal_push_run`, and the
project columns `project_folder_url`, `delivered_root_url`, `webmap_url` (plus the lon/lat check
constraint); public holidays and related changes are in the same migration.

Roles (`src/domain/shared/enums.ts`): PROJECT_MANAGER, TEAM_LEAD, DISCIPLINE_DIRECTOR,
MANAGEMENT, ADMINISTRATOR, MEMBER, VIEWER. Permission keys (`src/domain/authz/permissions.ts`):
actual:manage/read/self, allocation:decide/manage/read/readNames, audit:read, bid:manage/read,
budget:manage/read, calc:manage, calendar:manage/read, capacity:read, client:manage/read,
dashboard:director/management/pm/teamLead, discipline:manage/read,
employee:manage/read/readCost/readNames, holiday:manage, import:run, leave:manage/read/readType,
list:manage, profile:manage, project:manage/plan/read, rate:manage, report:export,
request:create/decide/read/route, review:read, setting:manage/read, stage:manage/read,
team:manage/read, user:manage/read.

Calculator maths (`src/domain/bids/calculator.ts`): hours = weeks x days per week x
hours per day (195 hours over 22 days) x effort factor; cost = hours x hourly raw rate x location
multiplier (KSA 2.8, DXB-AUH 2.32, DXB-South 1.82). Reference check reproduced from the Excel
Proposal Cost Calculator: TASREEF = 757.84 hours, 250,665.59 AED.

Budget rules (`src/domain/budget/rules.ts`): rate lookup prefers a region rate over
the "all" rate; forecast = actual + remaining planned; RAG red when over budget, amber from 80%,
green below (`BUDGET_THRESHOLDS = [80, 100]`, RAG amber from 80% consumed, red when over); a Member may enter hours for the
current and the previous ISO week (older weeks need an unlock); `justificationRequired` is true
when actual hours exceed planned hours.

### 3.2 GIS Practice Hub (migrations 0000_init, 0001_constraints)

Authentication and access (`src/infrastructure/db/schema/auth.ts`, `access.ts`): Better Auth
tables, `app_user`, `role_assignment` (role, scope type GLOBAL or REGION, regionId = id of a
`list_item` of list `region`), `api_key`, `audit_log` (trigger `gh_reject_mutation` blocks update
and delete), `app_setting`, `import_run`.

Hub registers (`src/infrastructure/db/schema/hub.ts`), one table per workbook sheet, columns named
after the sheet columns:

| Table | Sheet | Notable columns |
| --- | --- | --- |
| `list_item` | Lists | listKey (22 lists), value, sortOrder, group (discipline group) |
| `report_period` | Lists (bi-weekly calendar) | startDate, endDate, label; seeded from 2026-09-28, 80 periods of 14 days |
| `project` | Projects | name (unique, citext), client, jobNo, currentDesignStage, status, gisLead, stageStates jsonb (MP, CP, SD, DD, CD, IFC states), qaqcChecklistUrl, rfiLogUrl, crsOpen, crsInReview, crsClosed, milestoneOverride, lastUpdated, remarks, dataShareFolderUrl, latitude, longitude, locationLabel, version |
| `package` | Packages and Delivery Tracker | projectId, stage, discipline, description, dimension, status, plannedSubmission, actualSubmission, gisStart, progress, clientReviewStatus, assignedTo, remarks |
| `schema_feature` | Schema Tracker | project text and link, featureClass, geometry, status, sourceFileUrl, shareFolderUrl, owner, remarks (15 workbook columns) |
| `resource_row` | Resources | name, role, hub (region), availability, plannedHours, actualHours, projects |
| `update_item` | Updates | projectId, meetingDate, periodFrom, periodTo, reportPeriodId, type (Accomplishment / Progress; Priorities / Planned (Next 2 Weeks); Concerns and Mitigations), description, enteredBy |
| `risk` | Risks | projectId, description, rag, owner, status, mitigation |
| `rfi` | RFI Log | projectId, ref, raisedBy, dateRaised, dueDate, status, response |
| `qaqc_checklist` | QAQC | projectId, package, checks jsonb (8 checks), reviewer, date |
| `standard_item` | Standards | title, versionLabel, status, owner, link |
| `innovation_item` | Innovation | title, category, status, owner |
| `enterprise_app` | project update sheet box | projectId, name, url |
| `workflow_step` | project update sheet | projectId, order, step, status (12 default steps) |
| `client_schema`, `client_feature_class`, `client_field`, `client_subtype`, `client_domain` | client Master Tracker workbook | per client: feature classes, dictionary fields, subtypes, domains |

Exact column lists are in `src/domain/hub/registers.ts` (register definitions as data: columns,
types, dropdown sources, required flags, zod row schema) and `docs/workbook-mapping.md`.

Roles: ADMINISTRATOR, GIS_MANAGER, GIS_LEAD, GIS_SPECIALIST, VIEWER. Permissions
(`src/domain/authz/permissions.ts`): hub:read, project:manage, package:plan, package:progress,
schema:manage, resource:manage, update:manage, risk:manage, rfi:manage, qaqc:manage,
standard:manage, innovation:manage, workflow:manage, list:manage, period:manage,
clientSchema:manage, export:run, user:read, user:manage, setting:read, setting:manage, audit:read,
apiKey:manage, import:run. Specialists get progress-only editing on packages (`editableFields`).

Workbook formulas replaced by rules (`src/domain/hub/rules.ts`): stageCode, packageLabel,
deliveredText, inProgressText, disciplineGroup, daysOverdue, nextMilestone, submissionsInPeriod,
rfiOverdue, rfiRag, rfiCounts, qaqcScore, utilisation, resourcesRegion, projectUtilisation,
periodLabel, periodBucket, deliverySummary, dashboardKpis.

Settings keys (`src/domain/settings/settings.ts`): org.displayName, org.timeZone (Asia/Dubai),
report.itemsPerBlock (8), report.periodDays (14), map.styleUrl, map.center (lat 24.5, lon 46.5,
zoom 4.2), planner.url.

---

## 4. Features - GIS Resource Planner

Routes under `src/app/(app)` (after PR #8):

- Home dashboard per role (PM, team lead, discipline director, management).
- `/employees` staff register with working patterns and cost fields (cost visible with
  employee:readCost).
- `/projects` register, project stages, members, budget (AED), links to the Hub by URL
  (`hubUrl`, `qaqcChecklistUrl`, `rfiLogUrl`).
- `/clients`.
- `/allocations` weekly allocation grid per project and employee, profiles and periods;
  `/deployment` deployment view; `/requests` resource requests with routing and `/approvals`
  decisions; `/review` and `/hours-review` actuals review; `/my-hours` self entry of actuals with
  week open rules and unlock requests.
- `/leave` leave register; public holidays and calendars under admin.
- `/bids` register with status events and files; `/bids/[id]/calculator/[calcId]` proposal cost
  calculator (stages, roles, effort factors, locations); won bid becomes a project; proposal export
  `/api/bids/[id]/proposal` and `/api/bids/export`.
- `/reports/budget` and `/reports/planned-vs-actual`; Excel exports `/api/export/allocations`,
  `/api/export/budget`, `/api/export/deployment`.
- Admin: `/admin/users`, `/admin/profiles`, `/admin/teams`, `/admin/disciplines`, `/admin/staff-roles`,
  `/admin/stages`, `/admin/calendars` (holiday calendars and public holidays), `/admin/lists`,
  `/admin/rate-card` (rates, admin only), `/admin/calculator` (role catalogue, locations, effort
  factors), `/admin/import` (Excel import of the GIS deployment workbook), `/admin/settings`,
  `/admin/api-keys`, `/admin/audit`.
- API: `/api/auth/[...all]`, `/api/health`, `/api/hub/v1/{allocations,capacity,projects}`
  (read-only feed with x-api-key, originally for the hub module), `/api/jobs/mail` (JOB_TOKEN,
  flushes the e-mail outbox through SMTP).
- Scripts: `db:migrate`, `db:seed`, `demo:accounts`, `import:gis` (imports
  `Digital_Delivery_GIS_Practice-Resource_Deployment_P02.xlsm` style workbook), `bootstrap:discipline`,
  `mail:flush`, `db:wipe` (`scripts/wipe-project-data.ts`, removes project and planning data but
  keeps users, lists and settings; needs `-- --yes`).
- Documentation in `docs/`: ADRs 001 to 008 (008 = split of the Hub), bids.md, budget.md, brand.md,
  demo-script.md, deploy-render.md, manager-brief.md, pilot-discipline.md, runbook.md,
  plan/architecture-plan.md, plan/gis-addendum.md.
- Tests at dae1498: 86 unit, 52 integration, 6 end-to-end, all green in CI.
- Branding: wordmark "GIS Practice | Resource Planner" in the header (no logo), AECOM colour
  tokens, Arial.

What `main` still has that `split-planner` removes: the Hub Phase A module (hub registers inside
the planner, migration 0005 tables), the bundled hub register data shipped in the Docker image
(commit 152f23d), the AECOM Portal connector pieces. The Render planner service currently runs
`main` (0a05572), so the live demo still shows Hub Phase A screens [VERIFY by opening the demo].

---

## 5. Features - GIS Practice Hub

Screens (`src/app/(app)`), all mirroring the workbook sheets in the Home order:

- `/` Dashboard: report period selector (the cream cell of the workbook, `PeriodSelect`), KPI
  tiles (`dashboardKpis`), status table, status chart, projects map (MapLibre, projects placed by
  latitude and longitude).
- `/projects` register, `/projects/new`, `/projects/[id]/edit`; `/projects/[id]` is the project
  update page used in the progress meeting: header with stage chips MP to IFC, delivered and in
  progress text, next milestone, RFI and CRS counters, the three update blocks for the selected
  period (Accomplishment / Progress, Priorities / Planned (Next 2 Weeks), Concerns and
  Mitigations), risks, workflow steps, enterprise applications box, history panel. Export to
  Excel and PDF (`/api/export/report/[id]`).
- Generic register routes `/[register]`, `/[register]/new`, `/[register]/[id]` for packages,
  schema-tracker, resources, updates, risks, rfis, qaqc, standards, innovation. Forms are generated
  from the register definitions: strict dropdowns where the workbook rejects typed values, combo
  boxes elsewhere, people dropdowns read the Resources register, browser date pickers on every
  date, optimistic locking by `version`, audit history per row, specialists limited to progress
  fields on packages.
- `/delivery-tracker?project=` the Laheq-style tracker for one project with totals and overall
  progress, Excel and PDF export (`/api/export/tracker/[id]`).
- `/client-schemas` and `/client-schemas/[id]`: client Master Trackers (feature classes,
  dictionary, subtypes, domains) imported from `QIC_Master_Tracker_AECOM.xlsx` style files.
- Admin: `/admin/lists` (22 dropdown lists, discipline groups), `/admin/periods` (bi-weekly
  calendar: first start date, regenerate, edit), `/admin/import` (dry run then apply
  `GIS_Practice_Hub.xlsx`, client Master Tracker import with client name, import runs log,
  "Remove all register data"), `/admin/users` (create, roles, region scope, deactivate),
  `/admin/settings`, `/admin/api-keys`, `/admin/audit`.
- `/account/password`, `/login`.
- API: `/api/hub/v1/projects` (calculated columns included), `/api/hub/v1/packages?project=`,
  `/api/hub/v1/updates`, `/api/hub/v1/schema`, all with `x-api-key`; `/api/health`;
  `/api/export/register/[key]` Excel export of any register.
- Import rules (`src/application/hub/import.ts`): every sheet; rows match on natural keys
  (project name; project + stage + discipline + description for packages; project + period + type
  + description for updates); re-import updates instead of duplicating; lists are added and
  re-ordered, application-only values kept; the workbook calendar replaces the period calendar
  when present; workflow steps and enterprise applications read from each project update sheet;
  client Master Tracker replaced on every load; dry run through a rollback wrapper.
- Seed (`scripts/seed.ts`): first Administrator from `SEED_ADMIN_*`, SEED_LISTS (144 values),
  DEFAULT_WORKFLOW_STEPS (12), periods from 2026-09-28. `scripts/demo-accounts.ts`: manager, lead,
  specialist and viewer accounts `*.demo@aecom.com` with `DEMO_ACCOUNTS_PASSWORD`.
- Tests: unit (policy, hub-rules, audit, format), integration (users, import with the sample
  workbook `tests/fixtures/GIS_Practice_Hub_sample.xlsx`, exports), end-to-end smoke
  (`tests/e2e/smoke.spec.ts`). CI runs audit, lint, typecheck, unit, migrate, integration,
  Playwright with a `gh_e2e` database.
- Branding: wordmark "GIS Practice | GIS Hub", AECOM tokens, Arial, no logo.
- Documentation: `README.md`, `docs/workbook-mapping.md`, `docs/runbook.md`, `docs/brand.md`.

Differences from the workbook, all approved: date pickers; the map; role based editing; audit and
locking; idempotent import with dry run; exports; the API feed. Everything else (columns, names,
dropdown behaviour, formulas) follows the workbook.

---

## 6. Connectors and integrations

- **Render** (claude.ai connector, MCP server "Render"): used to create the Hub web service, set
  environment variables, read deploys and logs. The second free Postgres was refused, and
  `query_render_postgres` was blocked by the database's empty IP allow list. `get_postgres` does
  not expose connection strings; the owner copied the internal URL from the dashboard.
- **GitHub** (through the claude-code-remote session tooling and `gh`): repositories attached to
  the cloud session; pushes go through the session's git proxy. Repository creation by API was
  blocked by the permission classifier, so the owner created `gis-practice-hub` in the GitHub UI.
- **ArcGIS Online** (connector "Ahmed_Elfatih_Oline_GIS", AECOM ArcGIS Online organisation): used
  in the earlier phase to search content and to plan portal items for the hub (group "AECOM ME GIS
  Practice Hub" [VERIFY whether created]). The planner's local "aecom-portal" MCP connector with
  `provision_hub`, `sync_planner_to_hub` and `publish_survey` tools (commit 5f0acc6) was retired
  in Phase E (5b19bf6) and removed in the split (no `connectors/` folder and no `provision_hub`
  reference remain on `split-planner`).
- **Microsoft Entra ID**: optional sign-in in both apps through Better Auth generic OAuth2 when
  `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET` are set. Redirect URI
  `<APP_URL>/api/auth/oauth2/callback/microsoft-entra-id`. Not configured on Render.
- **E-mail** (planner only): outbox table flushed by `/api/jobs/mail` with `JOB_TOKEN` or
  `npm run mail:flush`, SMTP settings by environment. Not configured on Render.
- **Planner to Hub link**: the Hub exposes `/api/hub/v1/*` with API keys; the planner stores
  `hubUrl` per project and shows the planner URL in the Hub header (`planner.url` setting). No
  automatic synchronisation exists yet (see section 9).
- **OpenStreetMap tiles**: default map tiles come from the public OSM tile servers; the AECOM
  network may block them (see section 10).
- Other connectors visible in the session (Felt, GIS Cloud, Google Drive, Notion, Canva, Gamma,
  Miro, Vercel, Desktop Commander) were not used for these applications.

---

## 7. Claude Code setup

- Both repositories have a `CLAUDE.md` with the working rules (AECOM colours only from the tokens,
  Arial, wordmark not logo, never a long dash, client data stays on AECOM systems, no secrets in
  files, ESLint layer boundaries; the Hub adds "the workbook is the specification" and browser date
  pickers everywhere). The planner also has `AGENTS.md` with Next.js 16 guidance.
- Neither repository has a `.claude/` folder (no project settings, hooks, skills or agents). The
  building session ran in the claude.ai cloud environment with the repositories attached; MCP
  servers came from claude.ai connectors, not from a project `.mcp.json`.
- Session conventions to carry over into the new Project:
  - Commit messages end with the Co-Authored-By line and the Claude-Session link given by the
    session; never put a model identifier in commits, PR titles or bodies.
  - Short answers in points; never a long dash anywhere; hyphen only.
  - Delegate large multi-file builds to a fork agent in a worktree when useful; the planner split
    was done this way.
  - The sandbox proxy blocks `onrender.com`, so live URLs are verified through Render logs, not
    by fetching them.
  - Deliverables for the owner go to the scratchpad and are sent as files; repository files only
    for things that belong in the repository.
- Suggested additions for the new Project (not done): a `.claude/settings.json` allow list for
  read-only npm, git and gh commands; a `SessionStart` hook that runs `npm ci` and starts the local
  PostgreSQL so tests can run in cloud sessions.

---

## 8. Decision log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-10-20 | Build a standalone web application (Next.js, PostgreSQL) instead of ArcGIS Enterprise or Portal items for the practice tools | Full control of roles, workflow and exports; portal provisioning was explored and retired |
| 2026-10-20 | Host the demo on Render free tier now, move to an AECOM-hosted server later | Fast demo for management; client data stays off Render |
| 2026-10-21 | GIS Practice Hub built as a module inside the Resource Planner (Phases A to E) | One deployment at the time |
| 2026-10-21 | AECOM colour system with Earth Green primary; later the wordmark replaces the logo inside the apps | Brand compliance and the owner's instruction |
| 2026-10-21 | Rates and rate card administration are admin only; cost fields hidden behind employee:readCost | Confidentiality |
| 2026-10-21 | Proposal cost calculator equations taken as-is from the Excel calculator (195/22 hours per day, location multipliers) | Match existing proposals, TASREEF check |
| 2026-10-21 | Bids register lives in the planner, not in the hub | Bids feed resourcing |
| 2026-10-29 | Excel workbooks are the team's tools now; macros (.xlsm) rejected because the files must open in Excel Online and in the shared folder | Compatibility |
| 2026-10-29 | Reporting cadence: weekly manager meeting, bi-weekly regional progress meeting on the project update page; Updates sheet gets Meeting Date, Period From, Period To, editable first period start | Owner's process |
| 2026-10-30 | The Hub becomes a separate application and repository, 100% like the workbook; the planner is cleaned (PR #8) | Clear ownership: planner = people and money, hub = delivery |
| 2026-10-30 | Four confirmed points: app names on the wordmark; Hub Resources register manual until a planner API link exists, with an admin-only Excel import that updates the whole hub; the bi-weekly report stays in the hub; two Render services and two databases | Owner's confirmation |
| 2026-10-30 | Shared-instance database mode for the Hub on Render | Free tier allows one free Postgres per workspace |
| 2026-10-31 | `AECOM_PPT_Template.pptx` is the standard for future decks | Owner's instruction |
| 2026-11-01 | Admin account must use ahmed.elfatih@aecom.com; the Gmail seeded account is to be replaced | Corporate identity |

---

## 9. Decided but not yet built

Planner:

- Merge PR #8 (`split-planner`) into `main`; then close PRs #2 to #6; rebase and merge PR #7.
- After the merge deploys, run `npm run db:wipe -- --yes` against the planner Render database
  (through a Render shell or a one-off job) to remove the sample project data. Migration 0010
  drops the hub tables automatically on deploy.
- Planner to Hub API link keyed by project number (planner owns the project record, hub reports
  delivery status); the hub's Resources register then reads planner allocations.
- Create the AECOM admin user, disable demo accounts, deactivate the Gmail admin (same as the hub).
- Notifications and the digest e-mail, document register, SSO through Entra ID: parked.

Hub:

- Create the user ahmed.elfatih@aecom.com in Administration > Users with Administrator and
  GIS Manager roles, sign in with it, then deactivate the Gmail account seeded at first boot.
- Import `GIS_Practice_Hub.xlsx` (dry run first) and the client Master Tracker(s); add latitude and
  longitude on projects for the map; set `planner.url` in Settings.
- Disable or remove the four demo accounts before anyone outside the team sees the demo.
- Paid PostgreSQL of its own (or a second workspace) and removal of `HUB_DATABASE_NAME`.
- Check that OpenStreetMap tiles load from the AECOM network; otherwise set `map.styleUrl` to an
  approved tile service and add its host to `MAP_ORIGINS`.
- Resources register fed from the planner API (manual until then).
- Microsoft Entra ID sign-in (needs an app registration in the AECOM tenant).

Both:

- Migration to an AECOM-hosted server (Azure App Service or a VM with Docker, Azure Database for
  PostgreSQL, Key Vault for secrets) once IT approves; Render keeps only sample data until then.
- Create the OneDrive folder structure `GIS_Practice_and_Project_Portfolio\09_Systems_Development`
  (00_Governance, 01_Resource_Planner, 02_GIS_Practice_Hub with 01_Requirements to 09_Releases,
  03_Shared, 04_Archive) with the delivered PowerShell script
  `Create_09_Systems_Development_Structure.ps1`.
- Place the plan decks, HTML plans, working standard and build specs in that structure.
- Future desktop or script tools (ArcGIS Pro toolboxes, data QA scripts) were foreseen in the
  folder structure but nothing is built.

---

## 10. Known issues

- Hub admin seeded with engahmedelfatih@gmail.com because `SEED_ADMIN_EMAIL` was changed after the
  first boot; the seed only runs when no user exists. Fix by creating the AECOM user in-app (see
  section 9). The same applies to the planner seed [VERIFY planner admin e-mail].
- Render free services spin down after inactivity; the first request takes about a minute.
- Hub database lives on the planner's free PostgreSQL instance (shared-instance mode); the free
  instance has Render's 90-day expiry for free databases [VERIFY current Render policy] and no
  backups. `pg_dump` before bulk imports.
- Planner `main` still contains Hub Phase A; the live planner demo shows hub screens until PR #8
  is merged. The planner Render database still holds sample planning data until `db:wipe` runs.
- The planner `/api/hub/v1/*` feed was written for the in-planner hub and may need renaming or
  re-scoping when the planner to hub link is designed [VERIFY after PR #8].
- `onrender.com` is not reachable from the Claude cloud sandbox; verify deploys through the Render
  connector logs or from a browser.
- First Hub Docker builds failed because `public/` was empty and untracked; fixed by
  `public/.gitkeep` (13d9a35). Keep at least one tracked file in `public/`.
- Map tiles depend on public OpenStreetMap servers (fair-use policy; may be blocked on corporate
  networks).
- Demo accounts share one password from `DEMO_ACCOUNTS_PASSWORD`; the entrypoint recreates them on
  every start while the variable is set. Remove the variable to stop that.
- Sample data: every row in the workbooks and in the demos is sample data; the team e-mail said
  so. Real client data must not be loaded on Render.
- Playwright config uses port 3100; manual runs in the session used 3110 to avoid the dev server.
- `gh pr list` and GitHub API writes may be blocked in cloud sessions by the permission classifier;
  the owner may need to create repositories or merge from the GitHub UI.

---

## 11. Roadmap

Near term (next two to four weeks):

1. Merge PR #8, close superseded PRs, merge PR #7, run the planner data wipe.
2. Hub first setup by the owner: AECOM admin user, workbook import, client trackers, map
   coordinates, settings, disable demo accounts.
3. Team onboarding on the Excel workbooks and the working standard GIS-STD-001; Friday meeting;
   shared folder structure (project folders, Outgoing, Internal QA/QC with the master checklist).
4. Collect feedback from the first two bi-weekly cycles and adjust the Hub registers.

Mid term:

5. Planner to Hub link by project number (API keys exist on both sides); Hub Resources from
   planner allocations; planner shows delivery status from the Hub.
6. Entra ID sign-in on both; retire local passwords.
7. Move hosting to AECOM infrastructure; secrets in Key Vault; backups; a paid PostgreSQL per app
   until then if the demos stay on Render.
8. Notifications and the bi-weekly digest e-mail (planner outbox exists), document register.

Longer term:

9. Desktop and script tools under 09_Systems_Development (ArcGIS Pro toolboxes, QA scripts
   reading the Hub API).
10. Management dashboards combining planner cost and hub delivery.

---

## 12. Open questions

- Hosting: which AECOM platform (Azure subscription, on-premises) and who approves; timeline.
- Identity: will Entra ID app registrations be granted for both apps; which groups map to roles.
- Data: when does real project data move from the workbooks into the Hub, and does the Hub then
  become the master, or do the workbooks stay in parallel.
- Region scoping: should GIS Leads be scoped to their region (the Hub supports REGION scope) or
  stay global.
- Planner budget rules: confirm the 80% amber threshold and the week-open rule with finance.
- Map provider acceptable to AECOM (OSM, Esri basemap through the ArcGIS Online organisation, or
  none).
- Should the planner keep its `/api/hub/v1` feed name or be renamed to `/api/v1` when the link is
  redesigned.
- Ownership of the GitHub organisation account and Render workspace if the owner is unavailable.

---

## 13. Quick-start for a fresh Claude instance

1. Attach `engahmedelfatih-AECOM/resource-planner` and `engahmedelfatih-AECOM/gis-practice-hub`
   to the session. Read each `CLAUDE.md` first, then this handover, then `docs/` in each repository.
2. For the planner, work from `split-planner` until PR #8 is merged; after that from `main`.
3. Run the local checks before any push: `npm run lint && npm run typecheck && npm run test:unit`;
   integration and end-to-end tests need PostgreSQL on 5433 (Docker compose or `pg_ctl`).
4. Keep every change inside the layer boundaries; components never import application or
   infrastructure.
5. Colours only from the tokens in `src/app/globals.css`; Arial; wordmark, no logo; no long dash
   anywhere; no secrets in files; sample data only on Render.
6. For the Hub, the workbook (`tests/fixtures/GIS_Practice_Hub_sample.xlsx` and the owner's
   `GIS_Practice_Hub.xlsx`) is the specification: compare any register change with
   `docs/workbook-mapping.md` and `src/domain/hub/registers.ts`.
7. Deployments: pushing to `main` redeploys the Render service; check with the Render connector
   (`list_deploys`, `list_logs`) because onrender.com is unreachable from the sandbox.
8. Never print or store passwords; refer to environment variable names. Credentials live in the
   Render dashboard and with the owner.
9. Commit messages: imperative subject, body in points, the attribution lines of the session, no
   model identifiers.

---

## 14. Appendix

### 14.1 Last commits - resource-planner (branch split-planner, 24 commits in total)

```
dae1498 2026-10-30 Split the planner: move the GIS Hub out, wordmark, public holidays, data wipe
5b19bf6 2026-10-21 Hub Phase E: portal push job, retire provisioning and Survey123 pieces, hub runbook and user guide
0e83517 2026-10-21 Hub Phase D: budget monitoring with rate card, My hours, review, report and alerts
c716c7b 2026-10-21 Hub Phase C: bids register, proposal cost calculator, rates administration, won to project
79cb247 2026-10-21 Hub Phase B: home, registers, tracker exports and bi-weekly report
152f23d 2026-10-21 Docker: ship the bundled Hub register data with the image
3af23f1 2026-10-21 Hub Phase A: GIS Practice Hub inside the planner
378863e 2026-10-21 Audit: store only valid client IP addresses
fa0c1e6 2026-10-21 Brand: AECOM colour system with Earth Green primary
47d8621 2026-10-20 Docs: demo URL, demo script and management brief
96cd374 2026-10-20 Hosted demo: container entrypoint (migrate, seed, demo accounts), bundled scripts, Render blueprint and guide
8bff053 2026-10-20 Hub model: project workflow steps and GIS enterprise applications tables, extracted from the report sheets
5f0acc6 2026-10-20 Hub: local AECOM Portal connector with provisioning tools, importable provisioning, Pro sign-in for sync
e35cb2a 2026-10-20 Hub README: provisioning through the Claude ArcGIS connector
7cc2f3b 2026-10-20 Upgrade nodemailer to 10.1.7 to clear the production audit
c52cfc6 2026-10-20 GIS Practice Hub package and Phase 4: hub feed, Entra ID sign-in, e-mail outbox, import screen, actuals, review
0e628dc 2026-10-20 Phases 1 to 3: GIS planning model, capacity engine, allocations, requests, approvals and dashboards
f44056c 2026-10-20 Docker: provide build-stage placeholder env so next build can collect page data
a7103bd 2026-10-20 Tests: load the cleanup helper lazily so env is set before the DB client
f44fe3f 2026-10-20 CI: isolate the end-to-end database and clean up integration fixtures
07b326a 2026-10-20 Apply official AECOM logo and AECOM2021 palette
005c85f 2026-10-20 Fix correlated subqueries and make e2e runs deterministic
755c4b5 2026-10-20 Phase 0: foundations for the resource planning application
```

`main` head: 0a05572 2026-10-21 Merge pull request #1 from engahmedelfatih-AECOM/hub-phase-a.

### 14.2 Last commits - gis-practice-hub (branch main, 5 commits in total)

```
13d9a35 2026-10-31 Add public/.gitkeep so Docker build can copy /app/public
eddbadc 2026-10-30 Deployment: shared-instance mode creates the Hub database on an existing PostgreSQL instance at boot
c3cc98c 2026-10-30 GIS Hub: screens for every register, project update page, dashboard with map, delivery tracker, client schemas, admin lists, periods and import, exports, API feed, tests and docs
2bb400f 2026-10-30 GIS Hub: workbook rules, register services, periods, lists, workbook and client schema import with tests
c4a81e0 2026-10-30 GIS Hub foundation: auth, roles, settings, API keys, shell with wordmark, hub data model and migration
```

### 14.3 Dependencies

Runtime (both): better-auth 1.7.11, class-variance-authority ^0.7.1, clsx ^2.1.1, date-fns ^4.4.0,
drizzle-orm 0.45.4, exceljs ^4.4.0, lucide-react ^1.59.0, next 16.4.2, pdf-lib ^1.17.1,
pino 10.4.0, postgres 3.4.9, radix-ui ^1.8.1, react 19.3.0, react-dom 19.3.0, server-only ^0.0.1,
tailwind-merge ^3.7.0, zod 4.6.7. Planner only: nodemailer ^10.1.7. Hub only: maplibre-gl ^5.5.0.

Development (both): @playwright/test 1.64.1, @tailwindcss/turbopack ^4, @types/node ^22,
@types/react ^19, @types/react-dom ^19, @vitest/coverage-v8 5.0.5, dotenv ^18.0.8,
drizzle-kit 0.31.11, eslint ^9, eslint-config-next 16.4.2, eslint-plugin-boundaries ^7.2.0,
pino-pretty ^13.2.0, prettier ^3.9.10, prettier-plugin-tailwindcss ^0.8.1, tailwindcss ^4,
tsx ^4.23.15, typescript ^5, vitest 5.0.5. Planner only: @types/nodemailer ^8.0.2.

npm scripts (both): dev, build, start, lint, typecheck, format, format:check, test, test:unit,
test:int, test:e2e, db:generate, db:migrate, db:seed, db:studio, verify, demo:accounts. Planner
only: db:wipe, import:gis, bootstrap:discipline, mail:flush.

### 14.4 Specifications, prompts and deliverables produced outside the repositories

Uploaded by the owner (inputs): `GIS_Hub_in_Resource_Planner_BUILD_SPEC.md`,
`GIS_Practice_Hub_HANDOFF.md`, `GIS_Practice_Hub.xlsx` (and v2), `AECOM_GIS_Practice_Hub.xlsx`,
`Master_Tracker.xlsx`, `Projects_List.xlsx`, `RSG_Laheq_GIS_Tracker.xlsx`,
`Soudah_SD_AECOM_GIS_Tracker.xlsx`, `Digital_Delivery_GIS_Practice-Resource_Deployment_P02.xlsm`,
Proposal Cost Calculator workbooks (Red Sea, TASREEF), `AECOM_PPT_Template.pptx`,
`AECOM_Blank.docx`, `Portal_Connection.zip`, `GIS_Hub_Macros.bas`.

Produced in the building session and sent to the owner (not in git; copies should be filed under
09_Systems_Development):

- Workbooks: `GIS_Practice_Hub_v3.xlsx`, `GIS_Practice_Hub_v4.xlsm` (rejected), `GIS_Practice_Hub_v5.xlsx`
  (the current team workbook), `QIC_Master_Tracker_AECOM.xlsx`, and their Python builders
  (`build_hub_v3.py`, `build_hub_v5.py`, `build_master.py`).
- Working standard GIS-STD-001: `AECOM_GIS_Practice_Hub_Working_Standard.docx`, `.pptx` (20
  slides on the AECOM template), `.md` (for the Gemini notebook), with screenshots of the sheets.
- Team e-mail text (Friday meeting, resource planning meeting, bi-weekly progress meeting, shared
  folder structure with Outgoing and Internal QA/QC folders, master QA/QC protocol and checklist,
  "data in the sheets are sample only").
- Folder structure: `09_Systems_Development_Folder_Structure.md` and
  `Create_09_Systems_Development_Structure.ps1`.
- Planner split plan (`split-plan.html`), hub screenshots (`hubshots/`), `video-prompt.md` for a
  demo video, the Phase B to E check scripts (all in the building session's scratchpad, which is
  lost when that session ends; the owner holds the sent copies).
- The planner branch `brand-standards` (PR #7) holds `standards/templates` with the PowerPoint
  template and logo variants inside the repository.

### 14.5 Key source files to read first

Planner: `src/domain/shared/enums.ts`, `src/domain/authz/permissions.ts`,
`src/infrastructure/db/schema/*.ts`, `src/components/layout/nav.ts`, `scripts/wipe-project-data.ts`,
`docs/adr/008-*.md`, `docs/runbook.md`, `docs/deploy-render.md`.

Hub: `src/domain/hub/registers.ts`, `src/domain/hub/rules.ts`, `src/domain/hub/seed-lists.ts`,
`src/domain/authz/permissions.ts`, `src/application/hub/{registers,views,import,exports,periods,lists}.ts`,
`src/infrastructure/db/schema/hub.ts`, `scripts/ensure-db.ts`, `docker-entrypoint.sh`,
`docs/workbook-mapping.md`, `docs/runbook.md`.

---

## 15. Completeness check

Re-read on 2026-11-02 after writing. Each required section is present; the table says what each
one rests on and what still carries a [VERIFY] marker.

| Section | Source | Confidence | Remaining [VERIFY] |
| --- | --- | --- | --- |
| 1 Executive summary | both repositories, Render connector, session history | high | none |
| 2 Repository and environment | git logs, package.json, .env.example, render.yaml, CI files, Render connector | high | open PR list could not be re-queried (gh blocked in the sandbox); PR #7 rebase conflicts |
| 3 Data model | schema files, migrations, enums, permissions, rules | high | none |
| 4 Features planner | route folders, nav, scripts, docs on split-planner | high | live planner demo content (main still on Hub Phase A) not opened from the sandbox |
| 5 Features hub | route folders, registers.ts, rules.ts, import.ts, docs | high | none |
| 6 Connectors and integrations | session history, env names, code | medium | ArcGIS Online group "AECOM ME GIS Practice Hub" existence |
| 7 Claude Code setup | repository inventory (no .claude folders), session conventions | high | none |
| 8 Decision log | session history | medium (dates approximate to the day) | none |
| 9 Decided but not yet built | session history, owner confirmations | high | none |
| 10 Known issues | session history, Render logs | medium | planner seeded admin e-mail; Render free database expiry policy; planner feed re-scoping after PR #8 |
| 11 Roadmap | session history, owner's plan | medium | none |
| 12 Open questions | session history | n/a | none |
| 13 Quick-start | repository READMEs and runbooks | high | none |
| 14 Appendix | git log, package.json, uploads and scratchpad inventories | high | none |

Checks performed on the text: no long dash character anywhere (grep for U+2013 and U+2014 returned
zero); no password, token, secret value or connection string appears (environment variable names
only; the Render database id and service ids are identifiers, not credentials); every repository,
branch, commit, service, table, route, file and environment variable is named concretely; the
Hub is described as a separate application, with its earlier life as a planner module recorded in
sections 1, 4 and 8 and in the planner commit history.

Gaps a fresh instance should close first: run `gh pr list` on `resource-planner` to confirm the
open PRs; open both demo URLs from a browser to confirm which code is live; confirm the planner's
seeded admin e-mail in Administration > Users; decide the fate of `/api/hub/v1` in the planner.

Where this file lives: committed to `resource-planner` on branch `split-planner` (so it reaches
`main` with PR #8) and to `gis-practice-hub` on `main`, both at the repository root as
`HANDOVER_P10_Resource_Planner_and_GIS_Hub.md`.
