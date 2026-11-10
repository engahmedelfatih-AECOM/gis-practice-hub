# Backlog - GIS Practice Hub and GIS Resource Planner

Everything from sections 4 and 5 of TEST_AND_GAP_REPORT_2026-11-02.md that was not fixed in the
two fix branches of 2026-11-03. Nothing here is built. The GIS Manager chooses what comes next.

- Date: 2026-11-03
- Source: `docs/handover/TEST_AND_GAP_REPORT_2026-11-02.md` sections 4 and 5
- Out of this list: everything in the 2026-11-03 branches `fix/hub-report-2026-11-02` and
  `fix/planner-report-2026-11-02` (import defects, REGION scope, specialist progress, workbook
  rules, proxy and API key, maplibre, paging, hardening, the test set).
- Effort: small is under a day, medium one to three days, large is more than a week or depends on
  AECOM IT.

| # | Item | Value | Effort | Depends on |
| --- | --- | --- | --- | --- |
| 1 | Shared project key and the planner link | High | Large | 2 |
| 2 | Project number on the Hub project | High | Medium | - |
| 3 | Incremental feed with pagination and per-client keys | High | Medium | 1 |
| 4 | Exports in the workbook layout with embedded Arial | Medium | Medium | - |
| 5 | Entra ID sign-in | High | Large | AECOM IT |
| 6 | Central logging and alerting | High | Medium | AECOM IT |
| 7 | Key Vault for the secrets | Medium | Medium | AECOM IT |
| 8 | Move both applications to the AECOM server | High | Large | 5, 6, 7 |
| 9 | A second database for the Hub | Medium | Small | 8 |
| 10 | Map tiles that work on the AECOM network | Medium | Small | AECOM IT |
| 11 | Dashboard period as a manager-owned setting | Medium | Small | - |
| 12 | Remaining accessibility and contrast items | Medium | Small | - |
| 13 | Reconciliation report for unmatched projects | Medium | Small | 1 |
| 14 | Planner field for the Hub status | Low | Small | 1 |
| 15 | Coverage of the untested planner and Hub services | Medium | Medium | - |
| 16 | Scheduled backups and a restore test | High | Small | 8 |
| 17 | Hub "Hub" value mapped from the planner team names | Medium | Small | 3 |

## 1. Shared project key and the planner link

- Value: one project is one row in both systems, so the Hub Resources register can be filled from
  the planner instead of by hand, and a project update can show the planned and actual hours.
- Effort: large. A key on both sides, a sync job, a reconciliation page and the rules for what
  wins when the two differ.
- Depends on: item 2 (the key itself).
- Note: today the Hub holds Project Name and Job No., the planner keys on Project Number and holds
  Job Number. A match on name is not safe.

## 2. Project number on the Hub project

- Value: the field both systems can match on, and the number the team already uses on paper.
- Effort: medium. A column, the import mapping, the forms, the exports and a uniqueness rule.
- Decision needed: is the planner's Project Number the master, or the Hub's Job No.?

## 3. Incremental feed with pagination and per-client keys

- Value: the feed stays usable when the registers grow, and each consumer (planner, Power BI, a
  client) gets its own key and its own scope, which can be revoked on its own.
- Effort: medium. A `since` parameter, a page cursor, scopes on the key, and the audit of what a
  key read.
- Depends on: item 1 for the planner side.

## 4. Exports in the workbook layout with embedded Arial

- Value: an export that can be sent to a client without being reformatted: the workbook's header
  block, the side-by-side update layout, dd-mmm-yyyy dates and Arial embedded in the PDF.
- Effort: medium. The Excel export already carries the tokens and Arial; the PDF needs the font
  embedded and the layout rebuilt.

## 5. Entra ID sign-in

- Value: no local passwords, AECOM joiners and leavers handled by IT, and multi-factor
  authentication from the corporate tenant.
- Effort: large, mostly waiting: the code path exists in both applications but needs an
  application registration, a redirect URI and the group to role mapping.
- Depends on: AECOM IT.

## 6. Central logging and alerting

- Value: logs that outlive a Render restart, and a message when the application is down or the
  database refuses connections. Today the logs are pino JSON on stdout with short retention.
- Effort: medium. A log drain or Azure Monitor, plus an uptime check.
- Depends on: AECOM IT for the destination.

## 7. Key Vault for the secrets

- Value: the database URL, the auth secret and the API keys held in one audited place instead of
  the Render environment variables.
- Effort: medium once the vault exists.
- Depends on: AECOM IT.

## 8. Move both applications to the AECOM server

- Value: real client and project data may be held, which Render may not. This is the condition for
  the Hub to replace the workbook for live projects.
- Effort: large. A host, the database, the deployment, the certificates and the cutover.
- Depends on: items 5, 6 and 7, and on AECOM IT.

## 9. A second database for the Hub

- Value: the Hub and the planner stop sharing one database, so a migration or a wipe on one cannot
  touch the other.
- Effort: small on a new host (one more database and one environment variable).
- Depends on: item 8. Not worth a paid Render instance on its own.

## 10. Map tiles that work on the AECOM network

- Value: the project map keeps working inside the office. Today the CSP allows the public
  OpenStreetMap servers, which the corporate network may block.
- Effort: small. An approved tile host, or a cached style, in `MAP_ORIGINS`.
- Depends on: AECOM IT to name the allowed host.

## 11. Dashboard period as a manager-owned setting

- Value: everyone opens the Dashboard on the same period, as the workbook's single cream cell does.
  Today the period is per user in the URL.
- Effort: small. One setting, the Dashboard default and the manager screen to change it.

## 12. Remaining accessibility and contrast items

- Value: the screens stay usable for everyone and meet the AECOM digital standard. The skip link,
  the aria labels and the raw white are done; the contrast of the status chips and the focus order
  of the long register tables are not.
- Effort: small, screen by screen.

## 13. Reconciliation report for unmatched projects

- Value: a page that lists the projects one system has and the other does not, so the link cannot
  silently drop a project.
- Effort: small once the key exists.
- Depends on: item 1.

## 14. Planner field for the Hub status

- Value: a planner user sees the GIS delivery status without opening the Hub.
- Effort: small.
- Depends on: item 1.

## 15. Coverage of the untested planner and Hub services

- Value: the services with no test today are the ones a change can break unnoticed: the Hub's
  project extras, client schemas, feed, API keys and audit read; the planner's GIS import, bids
  import, calendars, staff roles, clients and job token.
- Effort: medium, and it can be done a file at a time.

## 16. Scheduled backups and a restore test

- Value: a backup nobody has restored is not a backup. Render now keeps point-in-time recovery and
  manual exports; the AECOM server needs its own schedule and a restore rehearsal.
- Effort: small per environment.
- Depends on: item 8 for the AECOM side. The off-Render export advice of the 2026-11-02 report
  stands until then.

## 17. Hub "Hub" value mapped from the planner team names

- Value: Resources rows filled from the planner land in the right hub (India, Romania, South
  Africa, Dubai, Mix EC Resources) instead of carrying a planner team name.
- Effort: small: one mapping table, kept with the Hub / Region list.
- Depends on: item 3.
