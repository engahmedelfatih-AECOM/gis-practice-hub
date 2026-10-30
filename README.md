# Resource Planner

Engineering resource-planning web application: employee capacity, resource requests, allocations,
approvals and management dashboards. Built as a standalone, server-enforced system of record.

**Current release: Phases 0 to 3.** Secure sign-in and scoped role-based access; master data
(disciplines, teams, staff roles, holiday calendars with regional weekly hours, employees and
working patterns, clients, projects with stage windows, users and roles, settings); leave;
capacity engine (ISO weeks, holidays, leave, 45 h / 9 h defaults); direct allocations with
optional approval, reassignment and stage-date sync; resource requests with Team Lead proposals
and Director decisions; deployment grid; role dashboards; CSV exports; full audit and workflow
history. The real GIS practice plan is loaded with `npm run import:gis` or Administration, Import
workbooks (see `docs/plan/gis-addendum.md`).

**Hub Phase A:** the GIS Practice Hub as a planner module: project Hub page (stage band, workflow
strip, GIS Submission Tracker tabs, bi-weekly updates, risks, applications, live resources),
registers (projects, risks, standards, innovation), Administration lists and design disciplines,
register data migration and "Remove imported data" (see `docs/hub/phase-a.md`, ADR-007).

**Hub Phase B:** Hub home with KPIs and the embedded ArcGIS dashboard and map, packages /
updates / resources registers with filters and Excel export, tracker Excel and PDF exports in the
Soudah layout with a dashboard view, and bi-weekly report generation (Excel and PDF, stored per
period) from the Updates and Bi-weekly review pages (see `docs/hub/phase-b.md`).

**Hub Phase C:** Bids register with a status workflow and history, the Proposal Cost Calculator
(revisions, complexity and hours matrices reproducing the Excel maths, Administration-managed
rates, factors and location multipliers, Excel / PDF export, workbook import) and "Won" that
creates the planner project with its budget and stage windows (see `docs/hub/phase-c.md`).

**Hub Phase D:** budget monitoring: rate card per staff role and region with history, planned and
actual cost per project (per person and per stage) with forecast, variance and RAG, My hours for
weekly actuals with justification over plan and Team Lead review, a budget report with CSV / Excel
export and 80 % / 100 % alerts (see `docs/hub/phase-d.md`).

**Hub Phase E:** portal push job that keeps the GIS Hub Data feature service (projects layer,
packages, risks and updates tables) current from the planner after changes and nightly, with an
Administration page and run history; the ArcGIS provisioning scripts, the local connector and the
Survey123 forms are retired. Hub runbook and user guide under `docs/hub` (see
`docs/hub/phase-e.md`).

**Phase 4 (integration and identity):** read-only JSON feed for the GIS Practice Hub with API keys
(`/api/hub/v1`), Microsoft Entra ID sign-in, e-mail notifications through an outbox, in-app
workbook import, actual hours with a planned versus actual report, a bi-weekly review page and a
pilot bootstrap for other disciplines. The ArcGIS side of the hub (feature service definition,
dashboard and map) lives under `hub/` (see `hub/README.md`).

## Stack

TypeScript · Next.js (App Router) · React · Tailwind CSS · PostgreSQL 16 · Drizzle ORM · Better Auth
· Vitest · Playwright · Docker. Architecture decisions are recorded in `docs/adr`.

## Quick start

```bash
cp .env.example .env.local      # set BETTER_AUTH_SECRET
docker compose up -d db
npm ci && npm run db:migrate && npm run db:seed
npm run dev
```

Sign in with the `SEED_ADMIN_*` account, then create users and grant roles under Administration.

To load the GIS practice workbooks instead of typing the plan in:

```bash
npm run import:gis -- --projects Projects_List.xlsx \
  --deployment Digital_Delivery_GIS_Practice-Resource_Deployment_P02.xlsm \
  --hub AECOM_GIS_Practice_Hub.xlsx            # dry run: prints what would change
npm run import:gis -- ... --commit            # apply
```

## Repository layout

```
src/domain          pure business rules: permission matrix, validation schemas, settings, enums
src/application     use cases (policy, validate, transaction, audit), capacity, planning, dashboards
src/infrastructure  database schema/client/migrations, authentication provider, env
src/components      UI components (brand tokens in src/app/globals.css)
src/app             Next.js routes, server actions, layouts
db/migrations       versioned SQL migrations (drizzle-kit)
scripts             migrate, seed, import:gis, bootstrap:discipline, mail:flush
hub/                ArcGIS Practice Hub: data model, service definition, XLSForms, provisioning, sync
tests/unit          domain and policy tests        tests/integration  use cases against PostgreSQL
tests/e2e           Playwright smoke suites        docs/              plan, GIS addendum, ADRs, runbook, brand
```

Layer boundaries are enforced by ESLint; `npm run verify` runs lint, types and tests.

## Security model (summary)

- No self sign-up; Administrators provision accounts. Temporary passwords must be changed at first
  sign-in. Sessions are database-backed and revoked immediately on deactivation.
- Every server action and page calls a use case that checks the permission matrix
  (`src/domain/authz/permissions.ts`) and applies row-level scope (team / discipline / project).
- Database constraints, exclusion constraints and triggers back the application rules; the audit
  log is append-only at the database level.
- CSP with per-request nonce, HSTS, no-sniff and frame-ancestors headers via `src/proxy.ts`.

See `docs/runbook.md` for operations and `docs/plan/architecture-plan.md` for the full plan.
