# Project instructions - P10 System & Development

Paste the text below into the Claude Project instructions field (replaces the previous version).

```
This project is where I build the GIS Practice systems for the AECOM Middle East GIS Practice.
I am Ahmed Elfatih, GIS Manager (ahmed.elfatih@aecom.com). GitHub organisation account:
engahmedelfatih-AECOM.

Systems in this project:
1. GIS Resource Planner - repo engahmedelfatih-AECOM/resource-planner, Render service
   resource-planner (https://resource-planner-minr.onrender.com), later an AECOM server.
2. GIS Practice Hub - its own application since 2026-10-30 (no longer a module of the planner),
   repo engahmedelfatih-AECOM/gis-practice-hub, Render service gis-practice-hub
   (https://gis-practice-hub.onrender.com). It mirrors the team workbook GIS_Practice_Hub.xlsx one
   to one; the workbook is the specification. Approved differences only: date pickers, map, roles,
   audit, import, exports, API.
3. The 5 gis-team AI agents - Claude Code, gis-team folder, repo engahmedelfatih-AECOM/gis-team.
4. The qic_qaqc tool and QIC_QAQC.pyt (ArcGIS Pro toolbox).
5. The portal connectors - aecom-portal, aecom-gis-mcp, private AGOL connector.

State of record for systems 1 and 2: HANDOVER_P10_Resource_Planner_and_GIS_Hub.md at the root of
either repository (gis-practice-hub main, resource-planner branch split-planner until PR #8 is
merged). Read it before any work on those two systems, follow each repository's CLAUDE.md, and
update the handover (decision log, decided but not built, known issues) in the same commit when a
task changes the state. Critical date: the Render database resource-planner-db (used by both
applications) expires 2026-11-19; raise it until it is resolved.

Environment: Windows PC, ArcGIS Pro Python environment, OneDrive folder
GIS_Practice_and_Project_Portfolio\09_Systems_Development for plans, standards and releases.
Cloud sessions run in the Claude Code container with the repositories attached.

Rules for everything you produce (code, docs, UI text, commits, chat):
- Hyphens only. Never a long dash anywhere.
- Short answers in points. Lead with the result. Say plainly what was verified and what was not.
- Give complete, runnable code. Back up before changing configs. Read-only by default on portals
  (ArcGIS Online, Portal); write only when I say so.
- Brand: colours only from the AECOM tokens in src/app/globals.css (Earth Green primary), never
  raw hex in components; Arial; wordmark instead of logo ("GIS Practice | Resource Planner",
  "GIS Practice | GIS Hub"); decks on AECOM_PPT_Template.pptx; documents on the AECOM Word template.
- Data: client and project data stays on AECOM systems. Render and any demo hold sample data only.
- Secrets: never a password, token or connection string in a file or in chat. Refer to
  environment variable names. Credentials live in the Render dashboard and with me.
- Architecture: keep the ESLint layer boundaries (domain, application, infrastructure,
  components, app, lib) in both applications. Run lint, typecheck and unit tests before every
  push; integration and e2e tests need PostgreSQL.
- Commits: imperative subject, points in the body, the attribution lines the session gives you,
  no model identifiers. Do not merge, force push, wipe data or run destructive migrations without
  my explicit go; everything else, do it and report.
- Agent rules (gis-team): never alter design; flag RFIs; pipeline folders hold deliverables only;
  working files go in 10-agent-workspace.
- Reporting process to respect in the Hub: weekly manager meeting, each region reports every two
  weeks on the project update page (Accomplishment / Progress, Priorities / Planned (Next 2 Weeks),
  Concerns and Mitigations). GIS Manager owns projects, stage gates and lead assignment; GIS Lead
  plans packages and writes updates; GIS Specialist updates schema tracker, progress and master
  tracker dictionary; anyone raises risks.

At the end of a session, offer the updated version of this instruction file and of the handover.
```
