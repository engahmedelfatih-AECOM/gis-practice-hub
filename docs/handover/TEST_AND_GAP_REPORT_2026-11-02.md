# Test and gap report - GIS Resource Planner and GIS Practice Hub

- Date: 2026-11-02. Read-only assessment, nothing committed or pushed, no Render service or database touched.
- Code under test: `resource-planner` branch `split-planner` at 12e3016; `gis-practice-hub` branch `main` at 7ec1f72.
- Environment: Claude cloud container, PostgreSQL 16 local cluster (pg_ctl), Node 22, Playwright 1.64.1 with the pre-installed Chromium, sample data only (seed scripts, demo accounts, `tests/fixtures/GIS_Practice_Hub_sample.xlsx`).
- Evidence tags: **[Run]** = verified by running it in this session; **[Code]** = observation from reading the code, not executed.

## 1. Verdict

1. **GIS Practice Hub: not ready for team use.** Four blockers: import creates phantom rows (299 fake RFIs, 181 fake schema rows), REGION scope is not enforced, GIS Specialists cannot save package progress, and the API feed is unreachable for machine clients. [Run]
2. **GIS Resource Planner: ready for a controlled pilot on sample data** after PR #8 is merged and the database is secured; all suites green except one flaky end-to-end test; its API feed and mail job are blocked by the same proxy defect. [Run]
3. Risk 1 - ~~`resource-planner-db` expires 2026-11-19~~ Resolved 2026-11-03: the owner upgraded `resource-planner-db` to Basic-256mb (plan 0.1c-256mb, option A, no prior pg_dump); expiry gone, status available (read through the Render connector). Paid instance: point-in-time recovery (3 days on a Hobby workspace, 7 days on Pro) and manual logical exports kept 7 days. Remaining action: one off-Render copy (see section 5 item 1).
4. Risk 2 - Hub data integrity: import silently stores invalid dropdown values, drops text dates, loses typed Utilisation %, and region-scoped leads can read and write every region.
5. Risk 3 - Hub CI gate is red at the first step (`npm audit`: critical advisory in maplibre-gl), and the planner to hub link cannot work until `/api/hub/v1/*` passes the request proxy.

## 2. Results per test type

| # | Test | Planner | Hub | Not run / reason |
| --- | --- | --- | --- | --- |
| 1 | Lint | Pass (13 s) | Pass (8 s) | - |
| 1 | Typecheck | Pass (13 s) | Pass (8 s) | - |
| 1 | Unit | 86 passed, 0 failed, 0 skipped (3 s) | 31 passed, 0 failed, 0 skipped (2 s) | - |
| 1 | Integration | 52 passed, 0 failed, 0 skipped (27 s) | 13 passed, 0 failed, 0 skipped (17 s) | - |
| 1 | End-to-end (prod build) | 6 run: 5 passed, 1 failed on first run, passed on re-run (flaky) (223 s incl. build) | 3 passed (40 s incl. build) | - |
| 1 | `npm audit --audit-level=high --omit=dev` | Pass (13 moderate, 0 high) | **Fail** (13 moderate, 1 critical: maplibre-gl) | - |
| 2 | Coverage (domain + application, lines) | unit 9.9 %, integration 66.8 % | unit 8.5 %, integration 65.8 % | Unit and integration not merged; best of the two per module used below |
| 3 | Workbook parity | n/a | 7 mismatches; every other compared cell matches (section 3) | Cached values are as of 30-Oct-2026 (TODAY in RFI overdue); app used 02-Nov-2026 |
| 4 | Role walk-through | Page access for Admin, Director, Team Lead, PM, Management: 130 checks, 0 mismatches with matrix 16.2; actions covered by the integration suite | 43 steps: 37 pass, 4 fail, 2 allowed that the RACI says should not be | Planner Member and Viewer UI not run (no seeded accounts); planner flows driven through integration tests, not UI |
| 5 | Permissions and scope | 130 page checks plus server action probe (PM create client refused) | 14 allowed/forbidden probes pass; REGION scope 3 of 3 fail; API key 8 of 8 pass once past the proxy | Not every action in matrices 16.1 and 16.2 tried one by one (time) |
| 6 | Import robustness (Hub) | n/a | 9 cases: 4 pass, 5 defects | - |
| 7 | Export fidelity (Hub) | Not run | Update page and tracker, Excel and PDF: column order and headers match, Arial and token colours in Excel; layout differences listed | Planner exports not compared (no workbook layout given) |
| 8 | Security checklist | Static plus local probes | Static plus local probes | No scanning of Render URLs, by rule |
| 9 | Performance (50 projects, 2,000 packages, 5,000 schema rows, ~500 updates) | Not run | Run (section 3, M9) | Full import of a generated 2,000-row workbook not run: no generator that exceljs accepts; sample import timed only |
| 10 | Operations | Migrations empty and previous: pass; health: pass | Migrations empty and previous: pass; health: pass; pg_dump / pg_restore: pass (dump 132 ms, restore 273 ms, counts identical, audit trigger restored) | **Docker build not possible**: `npm ci` inside the image cannot reach the npm registry through the sandbox proxy (both images stop at that step) |
| 11 | Brand and text | Pass: 0 long dashes, Arial, wordmark | Pass with 2 minor findings | - |
| 12 | Accessibility basics | Not run | 6 screens: labels, names, focus, contrast | No screen reader test |

## 3. Defects, ranked

Blocker

- B1 Hub, import, RFI Log - import the sample workbook (dry run then apply) - expected 1 RFI; actual 300 rows: 299 with RFI No. "[object Object]", no project, status "Not Started" (not an RFI status); D24 RFI Total shows 1 against workbook 0. [Run]
- B2 Hub, authorisation, REGION scope - grant GIS_LEAD with REGION Romania, sign in - expected only Romania projects and no writes elsewhere; actual sees all 14 projects, created a risk on Laheq Island and edited a Laheq package. `scopeFor()` is never called and `can()` never receives a region. [Run] [Code]
- B3 Hub, Packages, GIS Specialist - open any package, change Progress %, save - expected saved; actual "Please correct the highlighted fields. Pick a project": plan fields are rendered disabled, not posted, and the server requires them. [Run]
- B4 Both, API feeds - `GET /api/hub/v1/projects` with a valid `x-api-key` and no cookie - expected 200 JSON; actual 307 redirect to /login (proxy `PUBLIC_PATHS` lacks `/api/hub` and `/api/jobs`). With a dummy cookie the key check works (200 valid, 401 missing or wrong, 405 POST). Planner `/api/jobs/mail` same. [Run]

Major

- M1 Hub, dependencies - `npm audit --audit-level=high --omit=dev` - expected exit 0 (CI first step); actual exit 1, maplibre-gl <= 6.4.0 critical XSS (GHSA-jrc7-96c5-q579). [Run]
- M2 Hub, import, Schema Tracker and Risks - import sample - expected 219 schema rows and 6 risks; actual 400 (181 with feature class "-") and 7 (one "-" with status "Not Started"). [Run]
- M3 Hub, import, strict dropdowns - Packages status "Done", dimension "4D" - expected rejection or warning; actual stored silently; the package then drops out of Delivered, In Progress and tracker totals. [Run]
- M4 Hub, import, dates typed as text - Planned Submission "12/11/2026", Actual "next week" - expected warning; actual both stored empty, no warning (data loss). [Run]
- M5 Hub, import, file saved by another tool - re-save the sample with openpyxl, import - expected import or clear message; actual "Something went wrong" (exceljs "anchors" error in the log). [Run]
- M6 Hub, Resources Utilisation % - workbook column I is a typed dropdown (0 to 120 %); app derives it from hours and has no field - imported 70 % and 50 % lost; Projects and Dashboard utilisation show "-". [Run]
- M7 Hub, RFI rules - workbook: RFI Closed = Closed + Answered, RAG Green unless Open; app: Closed only, Amber for Answered and blank. [Code] [Run on RFI-001: Green vs Amber]
- M8 Hub, Packages, specialist status - re-enable the disabled fields and post status "Approved" - expected refused (GIS-STD-001 3.3: specialist edits GIS start, progress, remarks up to Internal QA/QC); actual saved. [Run]
- M9 Hub, registers at scale - 2,000 packages, 5,000 schema rows - Packages page 4.3 s median, Schema Tracker 6.8 s; SQL under 20 ms, time is rendering; no pagination; list queries cap at 5,000 rows silently. [Run] [Code]
- M10 Hub, Next Milestone - workbook uses only packages not yet delivered (excludes Submitted, Resubmitted, Approved, Cancelled); app excludes only Approved and Cancelled, so a Submitted package can be the next milestone. [Code]
- M11 Hub, Dashboard Active Projects - workbook = Progressing + At Risk + On Hold; app = all except Completed and On Hold. Same value on the sample (9), differs when On Hold or Not Started exist. [Code]

Minor

- m1 Hub, Delivery Tracker label - workbook "MP - Masterplan - Plots & Parcels"; app and exports "Masterplan - Plots & Parcels (MP)". [Run]
- m2 Hub, Overall Progress - workbook averages filled progress cells only; app counts blanks as 0. [Code]
- m3 Hub, GIS Resources Region - workbook returns Mix when any "Mix EC Resources" row exists; app only when no EC hub. [Code]
- m4 Hub, import dry run - spurious warnings "Project X is not on the Projects sheet" for 9 projects that are on it; reports "Workflows: 0" (apply: 10). [Run]
- m5 Hub, import - renamed project creates a second project and keeps the old one; extra per-project sheet and extra column ignored, no warning. [Run]
- m6 Hub, audit log - trigger blocks UPDATE and DELETE (verified) but not TRUNCATE (verified on the local test database). [Run]
- m7 Hub, logs - every dry run logs "unhandled database error" at error level; logger service name is "resource-planner"; CI docker tag "resource-planner:ci". [Run] [Code]
- m8 Hub, PDF exports - Helvetica not Arial (pdf-lib standard fonts), "AECOM" text instead of the wordmark, ISO dates, truncated headers. [Run]
- m9 Hub, Excel exports - update page stacks the blocks vertically instead of the sheet's side-by-side layout; tracker header lacks Doc. No., Rev, Checked By, Approved By. [Run]
- m10 Hub, Dashboard - "Packages by status" and "Resources by hub" tables of the workbook are missing. [Run]
- m11 Hub, Packages QA/QC Result and RFI No. - calculated in the workbook, typed in the app. [Code]
- m12 Hub, brand - raw `#fff` in `src/components/hub/projects-map.tsx`. [Code]
- m13 Hub, accessibility - Enterprise Applications inputs (name, url) have no label; no skip-to-content link. [Run]
- m14 Both, API key also accepted as `?api_key=` (ends up in access logs). [Code]
- m15 Planner, `/projects/new` and `/clients/new` show the form to roles without permission; the server refuses on submit. [Run]
- m16 Planner, e2e `bids.spec.ts` flaky: new client missing from the project form on the first run, passed on re-run. [Run]

Workbook parity mismatches (sheet, cell, Excel, application)

| Sheet | Cell | Excel | App | Cause |
| --- | --- | --- | --- | --- |
| Dashboard | E10 Team Utilisation | 60 % | - | M6 |
| Projects | AE8 D11 Urban Core Utilisation % | 70 % | blank | M6 |
| Projects | AE14 QIC D9 Utilisation % | 50 % | blank | M6 |
| Projects | Y11 D24 RFI Total | 0 | 1 | B1 (blank status imported as "Not Started") |
| Projects | H14 QIC D9 GIS Resources Region | Dubai | South Africa | Workbook cell typed over the formula; app follows the formula. Team to correct the sheet |
| RFI Log | P6 RAG | Green | Amber | M7 and B1 |
| Delivery Tracker | B9 to B14 Discipline (stage) | "MP - Masterplan - Plots & Parcels" | "Masterplan - Plots & Parcels (MP)" | m1 |

Matched: Dashboard B6, D6, E6, F6, G6, B10, D10, F10, G10; Projects GIS Delivered, GIS In Progress, Next Milestone, Region (9 of 10), CRS and RFI counts (9 of 10); Delivery Tracker B30, D30, F30, J30, L30, N30 (51.7 % shown 52 %), Days Overdue O9 to O14; Updates D and N for all 12 rows; QAQC Q6 Result Fail, P6 Score 62.5 % shown "63 %". [Run]

## 4. Gaps

Specification (workbook vs `registers.ts` and `rules.ts`)

- Columns: all 10 registers keep the sheet columns in sheet order. [Run]
- Differs: Resources Utilisation % typed in workbook, derived in app (M6); Packages QA/QC Result and RFI No. calculated in workbook, typed in app (m11); RFI, Next Milestone, Active, Overall Progress, Region rules (M7, M10, M11, m2, m3).
- Missing: Dashboard "Packages by status" and "Resources by hub" (m10); workbook 20-row tracker limit not mirrored (fine).
- Added beyond approved differences: none found. Latitude, Longitude, Location belong to the approved map.
- Import does not apply the workbook's own validation (strict lists, dates) (M3, M4).

Process (GIS-STD-001 3.5 RACI vs matrix 16.1)

- QAQC: RACI Lead R/A, Specialist C; app gives Specialist `qaqc:manage` (created a checklist) [Run].
- Packages progress: RACI limits Specialist to GIS start, progress, remarks; app treats Status as a progress field (M8) and the UI blocks even legitimate progress (B3).
- Master Tracker: Lead is C; app gives Lead `clientSchema:manage`. [Code]
- Region rotation (two regions per meeting) needs REGION scope working (B2).
- Dashboard period is per user via URL, not a single manager-owned setting like the workbook's cream cell. [Code]

Integration (planner to hub by project number)

- Hub project has no project number field; only Name and Job No. Planner keys on `projectNumber` and holds `jobNumber`. A shared key must be added to the Hub (or Job No. made mandatory and unique on both).
- Hub feed exposes delivery columns, packages, updates, schema; planner feed exposes projects, stages, allocations (name, role, team, period hours, actuals), capacity. Enough to fill Hub Resources, except Hub "Hub" values must map from planner team names.
- Missing: reachability (B4), incremental sync (`since`), pagination, per-client keys with scopes, planner field to store Hub status, a reconciliation report for unmatched projects.

Operational (Render today vs AECOM server)

- SSO: Entra ID code present in both, not configured; local passwords (12+ characters, 5 sign-ins per minute per IP, no account lockout, 8 h idle sessions, HttpOnly Secure SameSite=Lax cookies) [Run].
- Backups: none; pg_dump and pg_restore work [Run]. AECOM server needs scheduled backups and a restore test.
- Logging: pino JSON to stdout, Render retention short; no alerting or uptime monitor. AECOM needs central logs (Azure Monitor or equivalent).
- Data residency: Render Frankfurt holds sample data only; real client data needs the AECOM-hosted environment.
- Secrets: in Render environment variables; no secrets found in files or in the fetched git history (28 and 10 commits) or in server logs [Run]. AECOM target: Key Vault.
- Map tiles: OpenStreetMap public servers in CSP `MAP_ORIGINS`; corporate network may block.

Test gaps (by module)

- Hub application under 60 % lines: `hub/registers.ts` 16 %, `hub/lists.ts` 20 %, `hub/periods.ts` 25 %, `settings/settings.ts` 16 %, `hub/project-extras.ts`, `hub/client-schemas.ts`, `hub/feed.ts`, `integration/api-keys.ts`, `audit/read.ts` 0 %, `shared/guard.ts` 56 %, `shared/db-errors.ts` 50 %. Domain all above 60 % except `authz/policy.ts` region branches.
- Planner application under 60 %: `imports/gis-import-core.ts`, `imports/gis-import.ts`, `bids/bids-import.ts`, `org/calendars.ts`, `org/staff-roles.ts`, `projects/clients.ts`, `jobs/job-auth.ts` 0 %; `org/teams.ts` 23 %, `bids/catalogue.ts` 27 %, `planning/profiles.ts` 48 %, `projects/projects.ts` 50 %, `lists/lists.ts` 51 %, `people/leave.ts` 55 %, `dashboards/dashboard-service.ts` 58 %, `bids/calculator.ts` 59 %; domain `workflow/hours.ts` 50 %.
- No test hits the proxy, so B4 passed CI.

## 5. Development suggestions (not implemented), in suggested order

1. Corrected 2026-11-03: the upgrade is done (option A, Basic-256mb). Still advised: create one logical export from the database Recovery page in the Render dashboard (or a pg_dump from the owner's PC) and keep the file off Render, because point-in-time recovery does not cover deletion of the instance or loss of the Render account; repeat before each bulk import - value high, effort small (owner action).
2. Add `/api/hub` and `/api/jobs` to `PUBLIC_PATHS` in both proxies, plus an e2e test calling the feed without a cookie - high, small.
3. Upgrade maplibre-gl to a fixed version and re-run the map - high, small.
4. Import: skip rows whose key cells are empty or formula-only, read formula results not objects, reject or warn on strict-list and date violations, keep a per-row warning list - high, medium.
5. Packages form for specialists: post plan fields as hidden values or validate only progress fields; remove Status from progress fields or limit it to statuses up to Internal QA/QC - high, small.
6. Enforce REGION scope: filter `loadAll` and register lists by `scopeFor`, pass the project region to `assertCan` on every write - high, medium.
7. Align rules with the workbook: RFI counts and RAG, Next Milestone, Active, Overall Progress, Region Mix; add typed Resources Utilisation % - high, small.
8. Add a shared project key (project number) to the Hub and design the planner link (incremental feed, reconciliation page) - high, large.
9. Paginate or virtualise register tables; remove the silent 5,000-row cap - medium, medium.
10. Exports: embed Arial in PDF, wordmark, dd-mmm-yyyy dates, workbook header block and side-by-side update layout - medium, medium.
11. Dashboard "Packages by status" and "Resources by hub" tables; computed QA/QC Result and RFI No. - medium, small.
12. Hardening: TRUNCATE guard on audit_log, drop `?api_key=`, logger service name, quiet dry-run log, skip link and labels, hide forbidden forms in the planner - low, small.
13. Entra ID sign-in, central logging, backups and Key Vault on the AECOM server - high, large (depends on IT).

## 6. Test coverage to add

- Hub e2e: API feed without cookie (200 with key, 401 without).
- Hub e2e: one scenario per role (Manager, Lead, Specialist progress save, Viewer read-only, REGION lead isolation).
- Hub integration: import of the sample asserts exact row counts per sheet (Projects 10, Packages 13, Schema 219, Resources 11, Updates 12, Risks 6, RFI 1, QAQC 1).
- Hub integration: import robustness set (bad dropdown, text date, missing sheet, renamed project, extra sheet, empty rows, non-Excel file).
- Hub unit: workbook parity fixtures generated from the cached values of the sample (every derived column).
- Hub integration: registers, lists, periods, settings, api-keys, client-schemas services.
- Planner integration: GIS deployment import, bids import, calendars, staff roles, clients, job token.
- Planner e2e: Member week-open rule and Viewer read-only; bid to calculator to won project through the UI with the TASREEF figures.
- Both: proxy unit test of `PUBLIC_PATHS`; audit TRUNCATE guard; docker build in CI (job exists, confirm green).

## 7. Could not test

- Docker image build: sandbox proxy blocks `npm ci` inside the build; CI `docker` job is the evidence to check.
- Planner Member and Viewer UI walk-through; planner bid to calculator to won project in the UI (verified at service level only: TASREEF 757.84 h, 250,665.59 AED by unit and integration tests [Run]).
- Full import timing with a generated 2,000-row workbook.
- Planner export fidelity (no reference layout given).
- Anything on Render (by rule): live data, live CSP, live SSO.
- Screen reader and colour-blind checks; contrast computed for token pairs only (white on Earth Green 4.50, just AA; white on Ocean Teal 3.45 large text only; grey #9d9d9c on white 2.71 fails).
- Local test artefacts: the audit_log of the local test database was truncated by the TRUNCATE probe (local only); all databases, servers and images were local and are discarded with the container.
