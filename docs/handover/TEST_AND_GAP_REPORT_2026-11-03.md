# Test and gap report - 2026-11-03 (re-run after the fixes)

Prepared on 2026-11-03 for Ahmed Elfatih, GIS Manager, AECOM Middle East GIS Practice.

This report says what the fix work of 2026-11-03 changed and what the same checks return now. It
follows TEST_AND_GAP_REPORT_2026-11-02.md, which stays the fix list; every item below uses that
report's numbering. Findings are tagged [Run] when they were verified by running the thing, and
[Code] when they were read from the code.

Scope of the re-run: the two fix branches, locally, on sample data only. Nothing was run against
the Render services or their database, and nothing is deployed: the live services still run the
code of `gis-practice-hub` main and `resource-planner` `split-planner`.

- Branches: `gis-practice-hub` `fix/hub-report-2026-11-02`, `resource-planner`
  `fix/planner-report-2026-11-02`
- Environment: local PostgreSQL 16, Node 22, production builds for the end-to-end runs
- Data: `tests/fixtures/GIS_Practice_Hub_sample.xlsx` and the seed lists

## 1. Verdict

- The four Hub blockers are closed. B1 (import), B2 (REGION scope), B3 (specialist progress save)
  and B4 (feed behind the proxy) each have a test that fails if they come back. [Run]
- The Hub is ready for a pilot with the team on sample data once the branch is merged. The real
  workbook can now be imported: the import reports every row it skips and every value it refuses,
  and it changes nothing silently. [Run]
- The planner findings are closed as well (B4, m14, m15, m16). [Run]
- One process item is still open and needs the owner: the RACI change (A9 below). Nothing in
  `permissions.ts` was touched.
- The database risk of the 2026-11-02 report is resolved: the instance was upgraded on 2026-11-03
  and carries no expiry date. One off-Render copy before each bulk import stays advised.

## 2. Test results

| # | Check | Planner | Hub | Note |
| --- | --- | --- | --- | --- |
| 1 | Lint | Pass, 0 errors | Pass, 0 errors | Only the ESLint boundaries deprecation warnings |
| 1 | Typecheck | Pass | Pass | - |
| 1 | Unit | 110 passed (was 86) | 56 passed (was 31) | New: proxy public paths, workbook rules |
| 1 | Integration | 52 passed | 44 passed (was 13) | New: parity, import robustness, scope, services |
| 1 | End-to-end (production build) | 7 passed (was 6, one flaky) | 8 passed (was 3) | New: feed without a cookie, five role walk-throughs |
| 2 | Coverage of the four named services (lines) | - | registers 93.6 %, lists 100 %, periods 100 %, settings 100 % | Bar was 60 %; was 16 / 20 / 25 / 16 % |
| 3 | Workbook parity | n/a | 39 cached values compared, 1 accepted difference | The difference is a workbook cell typed over its formula |
| 4 | Role walk-through | Member and Viewer accounts now exist | 5 of 5 scenarios pass | Manager, Viewer, Specialist, region lead, global lead |
| 5 | Permissions and scope | Forms hidden from roles without permission | REGION scope 6 of 6 checks pass | Was 3 of 3 failing |
| 6 | Import robustness | n/a | 7 cases, all pass | One case per defect of the 2026-11-02 report |
| 7 | `npm audit --audit-level=high --omit=dev` | Pass | Pass (13 moderate, 0 high) | maplibre-gl on 6.16 |

## 3. Import re-run on the sample workbook

Rows loaded, by sheet. "Skipped" counts rows that carry data but no key cell, which the workbook
itself does not count either.

| Register | Rows loaded | Skipped | Before the fix |
| --- | --- | --- | --- |
| Projects | 10 | 0 | 10 |
| Packages | 13 | 0 | 13 |
| Schema Tracker | 219 | 181 | 400 |
| Resources | 11 | 0 | 11 |
| Updates | 11 | 1 | 12 |
| Risks | 6 | 1 | 7 |
| RFI Log | 1 | 0 | 300 |
| QAQC | 1 | 0 | 1 |
| Standards | 13 | 0 | 13 |
| Innovation | 3 | 0 | 3 |

Also loaded: 80 report periods and 10 workflow steps. [Run]

Warning lines: 9, where the first run of the old code produced 193. They are:

1. Schema Tracker: 181 rows skipped because Feature Class is empty (rows 225 to 405).
2. Updates: 1 row skipped because Description is empty (row 17).
3. Risks: 1 row skipped because Risk / Issue is empty (row 12).
4. to 8. Schema Tracker rows 12, 13, 14, 218, 219: Status "SK to investigate requirements" and
   "Complete at 15%" are not on the Lists sheet; the cell was left empty.
9. QAQC row 6: Package / Submission is empty; imported as "-".

Items 4 to 9 are sheet corrections for the team, not application defects.

## 4. What was fixed

Hub, branch `fix/hub-report-2026-11-02`:

- B1, M2, M5, m4, m5: the import reads cached formula results instead of formula objects; a row
  counts only when its key cell has a value; a file saved by another tool (openpyxl, LibreOffice)
  loads, because the drawings are stripped and the file retried; the dry run resolves projects from
  the file itself, so no false "not on the Projects sheet" warnings, and it counts workflow steps.
  Skipped rows are summarised once per sheet with the row range. [Run]
- M3, M4: a value outside a Lists list skips the row when the field is required and is cleared when
  it is optional, always with a warning; a typed date is reported and never parsed; a percentage
  outside 0 to 120 is reported; unknown columns and sheets are listed once per sheet. [Run]
- B2: REGION scope is enforced on `loadAll`, the register lists, the single row read, the project
  page, the exports and every write, with the project's region taken from the hubs of the people
  allocated to it, as the workbook's GIS Resources Region column does. [Run]
- B3, M8: a GIS Specialist can save GIS start, progress, remarks and the status up to Internal
  QA/QC; the plan fields are read-only for that role and the form posts them unchanged, which is
  what used to make the save fail. [Run]
- M6, M7, M10, M11, m1, m2, m3: Resources Utilisation % is typed with the workbook's dropdown; RFI
  counts, RFI RAG, Next Milestone, Active Projects, Overall Progress and Region Mix follow the
  workbook formulas; the Delivery Tracker prints "DD - Roads & Highways". [Run]
- B4, m14: `/api/hub` and `/api/jobs` pass the request proxy, and the API key is read only from the
  `x-api-key` header. [Run]
- M1: maplibre-gl 6.16, the map renders and the audit is clean. [Run]
- M9: the registers page 100 rows at a time with a row count and Previous and Next; the silent
  5,000-row cap is gone. [Run]
- m6, m7, m10, m11, m12, m13: TRUNCATE guard on `audit_log`, the logger carries the service name,
  a dry run no longer logs its rollback as an error, no raw `#fff` in a component, aria labels and
  a skip link, the two missing Dashboard tables, computed QA/QC Result and RFI No. [Run]
- Found during the re-run and fixed in the same branch: a row of the Projects register has no
  project column, so it looked practice-wide, and a region-scoped lead could list and open a
  project of another hub. The scope now uses the row's own id on the list, the single read and the
  writes. [Run]

Planner, branch `fix/planner-report-2026-11-02`:

- B4, m14: the same proxy and API key fixes. [Run]
- m15: `/projects/new` and `/clients/new` are refused to roles that cannot create, instead of
  showing the form and rejecting it on submit. [Run]
- m16: `bids.spec.ts` waits for the new client option and for the revocation to appear instead of
  relying on timing; it passed three times in a row. [Run]

## 5. Tests added

- Unit: the request proxy public paths, in both applications (25 and 24 checks). [Run]
- Integration, Hub: workbook parity against the cached Excel values of the sample, from a fixture
  generated by `scripts/parity-fixture.ts`; import robustness, one case per defect; REGION scope on
  reads, writes, views and exports; the registers, lists, periods and settings services. [Run]
- End-to-end, Hub: five role walk-throughs (Manager, Viewer, Specialist progress save, region lead
  isolation, global lead). [Run]
- End-to-end, planner: the hub feed with no cookie at all - the header key answers 200, no key 401,
  a key in the URL 400, a revoked key 401, and an application page still redirects to the login
  page. [Run]
- Planner: Member and Viewer demo accounts, so the read-only roles can be walked through. Hub:
  a region-scoped GIS Lead demo account, and `scripts/import-sample.ts` to load the sample
  workbook locally. [Run]

Two existing expectations were corrected to the workbook, not to the code: the tracker label is
"DD - Roads & Highways" (m1), and an Updates row with no description is not a row, so the sample's
Updates count is 11 and not 12.

## 6. Decisions taken under "the workbook and GIS-STD-001 are the specification"

Each one is in the pull request description so it can be overruled.

1. Resources Utilisation % is typed with the workbook's dropdown (0 to 120 in tens); the hours only
   suggest a value when the cell is empty.
2. Packages QA/QC Result and RFI No. are calculated, never stored.
3. A register row exists only when its key cell has a value.
4. A blank package status on import becomes "Not Started", with a warning.
5. An Updates row with no description is skipped (sample count 12 to 11).
6. A value outside a Lists list skips the row when the field is required and is cleared when it is
   optional; a typed date is reported, never guessed.
7. A GIS Specialist's package status stops at Internal QA/QC.
8. The machine feed keeps a global system actor; only human sessions are region-scoped.

## 7. Still open

- A9, the RACI change: GIS Specialist loses `qaqc:manage`, GIS Lead keeps reading the client schema
  but loses `clientSchema:manage`. The matrix was put to the owner on 2026-11-03 and nothing is
  changed until he answers. [Code]
- The merge of both branches, which only the owner may do. The Hub auto-deploys from main.
- Six sheet corrections in the real workbook: five Status values that are not on the Lists sheet and
  one QA/QC row with no package name; and the GIS Resources Region cell of QIC D9, typed over its
  formula.
- Everything in `docs/handover/BACKLOG.md`, which is not in this scope.
- Not re-run on 2026-11-03: the Docker image build (the sandbox proxy still blocks `npm ci` inside
  the image; the CI job is the evidence to check), the planner export fidelity (no reference layout
  given), a generated 2,000-row workbook, and anything on Render, by rule.
