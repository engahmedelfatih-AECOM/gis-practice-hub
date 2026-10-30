# GIS Hub - runbook

## 1. Deployment (Render)

- `render.yaml` describes the web service (Docker) and the PostgreSQL database, separate from
  the Resource Planner service and database. Create them from the dashboard (New, Blueprint) or
  with the Render API, connected to the `gis-practice-hub` GitHub repository, branch `main`.
- Environment on the host (never in files): `DATABASE_URL` (from the database), `APP_URL` and
  `BETTER_AUTH_URL` (the public URL), `BETTER_AUTH_SECRET` (generated), `SEED_ADMIN_EMAIL`,
  `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD` (first start only), `DEMO_ACCOUNTS_PASSWORD`
  (demonstration only), `LOG_LEVEL`. Optional: `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`
  for Microsoft sign-in, `JOB_TOKEN` for scheduled calls, `MAP_ORIGINS` to allow other tile hosts.
- The container entrypoint runs the migrations and the seed on every start (both idempotent).
- Shared-instance mode: the Render free tier allows one free PostgreSQL per workspace. Set
  `DATABASE_URL` to the Resource Planner database (internal connection string) and
  `HUB_DATABASE_NAME=gis_practice_hub`; at first start the Hub creates its own database on that
  instance and uses it from then on. Move to its own instance by setting `DATABASE_URL` to the
  new database and removing `HUB_DATABASE_NAME`.
- Health: `GET /api/health`.

## 2. First setup

1. Sign in as the seeded Administrator and change the password.
2. Administration > Lists: check the dropdown values (loaded from the workbook defaults).
3. Administration > Report periods: set the first period start; the calendar follows.
4. Administration > Users and roles: create the GIS Manager, the four regional GIS Leads
   (optionally scoped to their region) and the GIS Specialists; Viewers for PMs.
5. Administration > Import workbooks: dry run, then apply `GIS_Practice_Hub.xlsx`; then the
   client Master Tracker(s) with the client name.
6. Administration > Settings: map centre and zoom, optional map style URL, the Resource Planner
   URL (shown in the header).
7. Projects: add latitude and longitude on each project to place it on the map.

## 3. Bi-weekly cycle in the application

Exactly as the working standard: specialists update Packages (GIS start, progress, remarks)
and the Schema Tracker; leads update Packages (dates, client review), Resources, Updates
(three types per project and period) and Risks; the GIS Manager picks the period on the
Dashboard and opens each project update page. Export the page to PDF for the record.

## 4. Imports

- `GIS_Practice_Hub.xlsx`: every sheet. Rows match on their natural key (project name;
  project + stage + discipline + description for packages; project + period + type +
  description for updates ...). Loading the same file again updates rows instead of duplicating.
- Lists: values are added and re-ordered; values that exist only in the application are kept.
- Periods: the workbook calendar replaces the application calendar when the Lists sheet has one.
- Workflow steps and enterprise applications are read from each project update sheet.
- Client Master Tracker: the client's feature classes, dictionary, subtypes and domains are
  replaced on every load (the file is the reference).
- "Remove all register data" clears projects and every register (not lists, periods, users).

## 5. Resource Planner link

The planner owns the project record; the hub tells it the delivery status. Create an API key
under Administration > API keys and read:

- `GET /api/hub/v1/projects` - every project with its calculated columns (status, stage states,
  delivered, in progress, next milestone, RFI and CRS counts, region, utilisation, location).
- `GET /api/hub/v1/packages?project=<id>`, `/updates`, `/schema` - the registers.

Send the key in the `x-api-key` header. Keys are hashed; the plain key is shown once.

## 6. Backups

`pg_dump` the Render database before a bulk import or "Remove all register data". Exports of
every register are available as Excel from the register pages.

## 7. Scripts

| Script                  | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `npm run db:migrate`    | apply migrations                                            |
| `npm run db:seed`       | first Administrator, lists, periods (idempotent)            |
| `npm run demo:accounts` | demonstration accounts (manager, lead, specialist, viewer)  |
