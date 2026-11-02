# First-session prompt - P10 System & Development

Use as the first message in the new Project.

Read HANDOVER_P10_Resource_Planner_and_GIS_Hub.md in the gis-practice-hub repository (same file
is on branch split-planner of resource-planner). Then:

1. Check the two remaining [VERIFY] items and update the file: the planner's seeded
   Administrator e-mail (Administration > Users on https://resource-planner-minr.onrender.com),
   and anything that changed on GitHub or Render since 2026-11-02 (open PRs, deploys, the
   database expiry date of resource-planner-db).
2. Report the state of the critical item: the Render database resource-planner-db expires on
   2026-11-19. Tell me the exact steps to upgrade it or to dump and recreate it, and wait for my
   decision before touching it.
3. Prepare the merge of PR #8 (split-planner into main) on resource-planner: confirm CI is green,
   list the PRs to close afterwards (#2 to #6) and confirm PR #7 still merges cleanly. Do not merge
   until I say so.
4. List, in points, the first setup steps I must do myself in the Hub (AECOM admin user, workbook
   import, client trackers, map coordinates, settings, demo accounts).
5. Tell me anything in the handover that contradicts the code you read.

Rules: hyphen only, never a long dash; short points; no secrets in files or chat; AECOM tokens and
Arial; sample data only on Render.
