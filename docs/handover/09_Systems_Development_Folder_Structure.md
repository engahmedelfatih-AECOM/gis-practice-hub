# 09_Systems_Development - folder structure

Location: `C:\Users\ElfatihA\OneDrive - AECOM\GIS_Practice_and_Project_Portfolio\09_Systems_Development`

Decision: one parent folder, two application folders with the same sub-structure, one shared folder for what both applications use. This keeps each application self-contained (it can be handed over on its own) while the standards, decisions and the API contract between the two live in one place.

```
09_Systems_Development
|-- README.md                         what is here and the rules below
|-- 00_Governance
|   |-- 01_Standards                  AECOM PPT and Word templates, brand.md, colour chart (the reference for every document)
|   |-- 02_Plans_and_Decisions        split plan (HTML, PPTX), decision log, meeting notes about the systems
|   |-- 03_Roadmap                    phase plans, backlog, parked items (notifications, document register, SSO)
|   `-- 04_Working_Standards          GIS-STD-001 Hub working standard (DOCX, PPTX, MD) and future standards
|-- 01_Resource_Planner
|   |-- 01_Requirements               source workbooks and notes that defined the app (deployment plan, projects list, calculator)
|   |-- 02_Design                     data model, screen plans, HTML and PPTX design decks
|   |-- 03_Source_Code                see rule 2: a link file to GitHub plus tagged release archives only
|   |-- 04_Deployment                 Render notes, environment variable NAMES (never values), runbook, backups procedure
|   |-- 05_User_Guides_and_Training   user guide, video prompts, videos, training slides
|   |-- 06_Data                       import workbooks and exports used with the app (sample data only outside AECOM systems)
|   |-- 07_Desktop_App                installers and packaging notes when a desktop build exists
|   |-- 08_Testing_and_Feedback       UAT checklists, test results, team feedback, issue list
|   `-- 09_Releases                   release notes per version, change log
|-- 02_GIS_Practice_Hub
|   |-- 01_Requirements               GIS_Practice_Hub.xlsx, client Master Trackers, the workbook as the specification
|   |-- 02_Design
|   |-- 03_Source_Code
|   |-- 04_Deployment
|   |-- 05_User_Guides_and_Training
|   |-- 06_Data
|   |-- 07_Desktop_App
|   |-- 08_Testing_and_Feedback
|   `-- 09_Releases
|-- 03_Shared
|   |-- 01_API_Contracts              the JSON feed and the project-number link between the two apps
|   |-- 02_Brand_Kit                  logo files, wordmark files, globals.css token list
|   |-- 03_Scripts_and_Tools          build scripts, workbook generators, utilities used for both apps
|   `-- 04_Database                   schema diagrams and migration notes (no dumps with client data)
`-- 04_Archive                        superseded versions, old workbooks (v2, v3, v4), retired pieces (Survey123, portal push)
```

## Rules

1. Code lives in GitHub (resource-planner and gis-practice-hub). OneDrive is not a code repository: `node_modules`, `.next` and `.git` folders must never be synced. `03_Source_Code` holds a `GitHub.url` link and one zip per tagged release (`v1.0.0.zip`), nothing else.
2. No secrets anywhere in these folders: no passwords, API keys, connection strings or tokens. `04_Deployment` lists variable names and where they are set (Render dashboard), not their values.
3. Client and project data stays on AECOM systems. `06_Data` holds the AECOM workbooks and exports; the Render demonstration only ever receives the GIS plan sample data.
4. One version of a document: the current file in its folder, older versions in `04_Archive` with the date in the name (`GIS_Practice_Hub_v4_2026-10-30.xlsx`).
5. File names: `Area_Subject_vX.Y.ext`, no spaces where a tool will read the file, dates as `YYYY-MM-DD`, never a long dash.
6. Every folder gets a short `README.md` saying what belongs there (the script below creates them).
7. The desktop applications, if built, are packaged from the same GitHub code; only installers and packaging notes go to `07_Desktop_App`.

## Where today's files go

| File | Folder |
|---|---|
| AECOM_PPT_Template.pptx, AECOM_Blank_Template.docx, brand.md, colour chart | 00_Governance/01_Standards |
| Planner-and-Hub-Split-Plan.pptx, split-plan.html | 00_Governance/02_Plans_and_Decisions |
| AECOM_GIS_Practice_Hub_Working_Standard.docx / .pptx / .md | 00_Governance/04_Working_Standards |
| GIS_Practice_Hub.xlsx (v5), QIC_Master_Tracker_AECOM.xlsx | 02_GIS_Practice_Hub/01_Requirements |
| GIS_Practice_Hub_v2 to v4, GIS_Hub_Macros.bas | 04_Archive |
| Resource Planner user guide, video prompt | 01_Resource_Planner/05_User_Guides_and_Training |
| Render service and database notes, runbooks | 0x_.../04_Deployment of each app |
| Deployment plan and projects list workbooks | 01_Resource_Planner/01_Requirements |
