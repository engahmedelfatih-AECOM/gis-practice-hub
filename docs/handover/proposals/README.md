# Proposals - what to build next

Prepared on 2026-11-10 for Ahmed Elfatih, GIS Manager. One page per item of `../BACKLOG.md`.
Nothing here is built. Each page has the current screen (Playwright, sample data, local build of
main at 2026-11-10), the change, the benefit for the team and the effort.

| # | Proposal | Effort | Depends on |
| --- | --- | --- | --- |
| 01 | [Shared project key and the planner link](01-shared-project-key-and-planner-link.md) | Large | Proposal 02 (the key) and proposal 03 (the feed) |
| 02 | [Project number on the Hub project](02-project-number-on-the-hub-project.md) | Medium | None |
| 03 | [Incremental feed with pagination and per-client keys](03-incremental-feed-with-per-client-keys.md) | Medium | Proposal 01 uses it on the planner side |
| 04 | [Exports in the workbook layout with embedded Arial](04-exports-in-the-workbook-layout.md) | Medium | None |
| 05 | [Entra ID sign-in](05-entra-id-sign-in.md) | Large in calendar time, about 2 days of work once IT has registered the applications | AECOM IT: application registration, redirect URI, the groups |
| 06 | [Central logging and alerting](06-central-logging-and-alerting.md) | Medium | AECOM IT for the destination. An interim uptime check on Render needs your go (a Render change) |
| 07 | [Key Vault for the secrets](07-key-vault-for-the-secrets.md) | Medium | AECOM IT. Makes sense together with proposal 08 |
| 08 | [Move both applications to the AECOM server](08-move-to-the-aecom-server.md) | Large | Proposals 05, 06 and 07, and AECOM IT |
| 09 | [A second database for the Hub](09-second-database-for-the-hub.md) | Small | Proposal 08. On Render it means a second paid instance |
| 10 | [Map tiles that work on the AECOM network](10-map-tiles-on-the-aecom-network.md) | Small | AECOM IT or the GIS platform team to name the allowed basemap |
| 11 | [Dashboard period as a manager-owned setting](11-dashboard-period-as-a-manager-setting.md) | Small | None |
| 12 | [Remaining accessibility and contrast items](12-accessibility-and-contrast.md) | Small | None |
| 13 | [Reconciliation report for unmatched projects](13-reconciliation-report.md) | Small | Proposals 01 and 02 |
| 14 | [Planner field for the Hub status](14-planner-field-for-the-hub-status.md) | Small | Proposals 01 and 02 |
| 15 | [Coverage of the untested services](15-coverage-of-the-untested-services.md) | Medium | None |
| 16 | [Scheduled backups and a restore test](16-scheduled-backups-and-restore-test.md) | Small | Proposal 08 for the AECOM side. On Render it needs an IP on the allow list, which is your decision |
| 17 | [Hub value mapped from the planner team names](17-hub-value-from-planner-teams.md) | Small | Proposals 01 and 03 |

## Suggested order

1. Now, no dependency: 11 (dashboard period), 12 (accessibility), 15 (test coverage), 04 (exports, once a
   reference export is approved).
2. The link to the planner: 02, then 03, 01, 17, 13, 14.
3. With AECOM IT: 05, 06, 07, then 08, 09, 16; 10 when the basemap is named.

The order is a suggestion. The GIS Manager chooses.
