# GIS Practice | GIS Hub

The GIS Practice Hub application: the `GIS_Practice_Hub.xlsx` workbook as a web application for
the AECOM Middle East GIS Practice. Projects, packages, delivery tracker, schema tracker,
resources, bi-weekly updates, risks, RFIs, QA/QC checklists, standards, innovation, the client
Master Trackers, a dashboard with a map, and the project update page used in the progress
meeting. The working standard GIS-STD-001 describes who fills what.

## Stack

Next.js 16 (App Router, React 19 server actions), PostgreSQL 16 with Drizzle, Better Auth
(local accounts, optional Microsoft Entra ID), Tailwind 4 with the AECOM colour tokens, Arial,
MapLibre for the map, exceljs and pdf-lib for the exports. Same foundation and layering as the
Resource Planner (domain, application, infrastructure, components, app) enforced by ESLint.

## Run locally

```bash
npm ci
docker compose up -d                      # PostgreSQL 16 on port 5433 (gh_dev, gh_test)
cp .env.example .env.local                # set BETTER_AUTH_SECRET and the SEED_ADMIN_* values
npm run db:migrate
npm run db:seed                           # first Administrator, dropdown lists, report periods
npm run dev                               # http://localhost:3000
```

Sign in as the seeded Administrator, open Administration > Import workbooks and load
`GIS_Practice_Hub.xlsx` (dry run first), then the client Master Tracker.

## Checks

```bash
npm run lint && npm run typecheck && npm run test:unit
npm run test:int          # needs the gh_test database
npm run test:e2e          # production build on port 3100, seeded database
```

## Documentation

- `docs/workbook-mapping.md` - sheet by sheet mapping and the formulas replaced.
- `docs/runbook.md` - deployment (Render), first setup, imports, backups, the planner link.
- `docs/brand.md` - the AECOM colour system used by the tokens.

## Rules

See `CLAUDE.md`: AECOM colours only, Arial, wordmark instead of logo, no long dash, client data
stays on AECOM systems, no secrets in files, the workbook is the specification.
