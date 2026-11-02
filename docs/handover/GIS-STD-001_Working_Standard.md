# GIS Practice Hub and Schema Tracker
## Working Standard - how the GIS Practice plans, tracks and reports project delivery

AECOM Digital Delivery | Civil Infrastructure - Middle East | GIS Practice  
Document code GIS-STD-001 | Version 1.0 | Date 30-Oct-2026 | Owner: Ahmed Elfatih, GIS Manager  
Files covered: GIS_Practice_Hub.xlsx (the Hub); <Client>_Master_Tracker_AECOM.xlsx (one per client schema, for example QIC_Master_Tracker_AECOM.xlsx)

Audience: GIS Manager, the four regional GIS Leads (Liliana Ignat - Romania, Busisiwe Roberts - South Africa, Arun Belanke - India, Safa Hamed - Dubai) and every GIS Specialist of the AECOM Middle East GIS Practice.


# 1. Purpose and scope

This standard tells every member of the GIS Practice how we plan, track and report GIS delivery on our projects using two Excel files: the GIS Practice Hub and the client Master Tracker. It defines who fills what, when, and what the files do for us automatically. It is the reference for the weekly progress meeting of the GIS Manager and the bi-weekly updates of each regional team (India, Romania, South Africa and Dubai).

It applies to all GIS work delivered by the Middle East GIS Practice, for every client and every design stage, from the first data request to the final client approval.

- In scope: project registration, resource assignment, delivery planning per discipline and design stage, schema tracking against the client data model, QA/QC, RFIs, risks, bi-weekly updates and the progress meeting.
- Out of scope: timesheets and cost (Resource Planner), bids and proposals (Resource Planner), ArcGIS portal publishing (project procedures).


# 2. The two files

All tracking lives in two Excel files kept on the GIS Practice shared folder (SharePoint). Both are plain workbooks without macros, so they open in Excel desktop, Excel Online and on the shared folder with co-authoring. Everybody works in the same file. Nobody keeps a private copy.

| File | What it holds | Owner | Who edits |
|---|---|---|---|
| GIS_Practice_Hub.xlsx | The practice register: projects, packages, resources, updates, risks, RFIs, QA/QC, schema tracker, dashboard and one update page per project. | GIS Manager | GIS Manager, GIS Leads, GIS Specialists |
| <Client>_Master_Tracker_AECOM.xlsx | The client schema: feature classes with availability and status, the data dictionary, subtypes and domains. One file per client schema (QIC today). | GIS Manager | GIS Specialists (status), GIS Lead (review) |


## 2.1 Golden rules

1. One master file per workbook, on the shared folder. Open it from there. Never e-mail a copy and never work on a downloaded copy.
2. Green headers are yours to fill. Dark headers and grey cells are calculated. Never type over them.
3. Pick from the dropdown whenever there is one. Most dropdowns also accept a typed value, but the project name, the status values and the dates must match the lists exactly, because the dashboard and the reports count them.
4. Dates are typed as dd-mmm-yyyy (for example 15-Oct-2026). Ctrl + ; inserts today. The cell refuses anything that is not a real date.
5. Links, not attachments: paste the SharePoint or network path of the source file, folder, RFI or checklist. The files stay where they are.
6. One row per item. Never delete a row: set its status to Closed, Cancelled or Completed instead so the history stays.
7. Client and project data stays on AECOM systems. Do not copy the file or its content to personal storage or external tools.
8. The Lists sheet is maintained by the GIS Manager only. Ask for a new value instead of typing a variant.


## 2.2 Sheets of the GIS Practice Hub

| Sheet | Purpose | Filled by | When |
|---|---|---|---|
| Home | Navigation, cycle description and legend. | Nobody (read only) | - |
| Dashboard | KPIs, project status table and charts for the chosen period. | GIS Manager picks the period | Before each meeting |
| Project update sheets (one per project) | The one-page project update used in the progress meeting. Everything on it is pulled from the registers. | Nobody types here except the GIS Enterprise Applications box | Reviewed in the meeting |
| Report Template | Blank update page copied for each new project. | GIS Manager | At project creation |
| Projects | Master record: one row per project, status, GIS lead, stage states, links, share folder. | GIS Manager | At creation, then as the project moves |
| Packages | One row per discipline package per design stage: dates, status, progress, assigned staff, QA/QC and client review. | GIS Lead (plan), GIS Specialist (progress) | Weekly |
| Delivery Tracker | One-page submission tracker per project, pulled from Packages. Pick the project in B4. | Nobody (view) | For PM and client meetings |
| Schema Tracker | One row per feature class of the client schema with availability, status, source file and share folder links. | GIS Specialist | During data collection and production |
| Resources | Who works on which project, role, hub, allocation dates, hours and utilisation. | GIS Lead | After the resource meeting, then bi-weekly |
| Updates | Accomplishment / Progress, Priorities / Planned (next 2 weeks), Concerns and Mitigations per project and period. | GIS Lead | Before each bi-weekly meeting |
| Risks | Risks, issues and support needed from management. | Anyone | As soon as known |
| RFI Log | Requests for information to disciplines or the client. | GIS Specialist or GIS Lead | When raised and when answered |
| QAQC | One checklist per package submission, eight checks, score and result. | Reviewer (GIS Lead or QA/QC reviewer) | Before every submission |
| Standards | Practice standards library with links. | GIS Manager | When a standard changes |
| Innovation | Practice development and innovation log. | Anyone | When an idea or initiative starts |
| Lists | Dropdown sources and the bi-weekly period list. | GIS Manager | Rarely |

*Figure 1 - Home sheet: links to every sheet, the cycle and the cell legend.* (snapshot: home.png)


# 3. Roles and responsibilities


## 3.1 GIS Manager - Ahmed Elfatih

- Owns both files, the Lists sheet, the period calendar and this standard.
- Creates every project in the Projects register with all details, and creates its project update sheet.
- Agrees the stage gate dates (design stage submissions) with the client and the Project Manager and records them in the Hub. These dates are the GIS Manager's responsibility.
- Assigns the GIS Lead to the project after the green light in the resource meeting.
- Runs the weekly progress meeting, reviews the project update sheets, the Dashboard and the Risks, and decides on support requests.
- Keeps the client Master Tracker files up to date with the latest client schema (dictionary, subtypes, domains).


## 3.2 GIS Lead (regional lead: Liliana Ignat - Romania, Busisiwe Roberts - South Africa, Arun Belanke - India, Safa Hamed - Dubai)

- Coordinates directly with the assigned GIS resources of the project.
- Plans the delivery in Packages: one row per discipline per design stage, with planned submission dates in line with the resource deployment plan and the stage gate dates agreed by the GIS Manager.
- Enters the team in Resources (name, role, hub, allocation period, planned hours) and keeps utilisation current.
- Keeps Packages current for the columns the lead owns: status, planned and actual submission, approval, client review status, comment reference, revision and re-submission date.
- Reviews the Schema Tracker filled by the specialist and signs off the QA/QC checklist before every submission.
- Writes the Updates for the project before the bi-weekly meeting: Accomplishment / Progress, Priorities / Planned (next 2 weeks), Concerns and Mitigations.
- Raises risks and escalations in Risks.


## 3.3 GIS Specialist

- Collects the design data: coordinates with all disciplines, or takes the data from ACC or the project share folder when it is already there.
- Sets up the Schema Tracker rows for the project from the client schema and data dictionary: Project, Grouping Abbr, Grouping Name, Feature Class, Feature Class Alias, Geometry Type.
- Updates the client Master Tracker (Dictionary, Subtypes, Domains) when the client schema changes, with the GIS Manager.
- Keeps the Schema Tracker current during production: Discipline, Discipline Individual, Available / Unavailable, GIS Comments, Status, Notes, Source File Link and Share Folder Link (the project share folder).
- Updates the Packages columns that belong to the specialist: GIS start date, progress %, remarks, and the status up to Internal QA/QC.
- Raises RFIs to disciplines for missing or unclear data and records the answers in the RFI Log.
- Raises risks in Risks when something threatens the plan.


## 3.4 Inputs from outside the practice

- Project Manager: stage gate dates, client contacts, approval of the GIS deliverable list.
- Discipline leads: design data (Code B), answers to RFIs, confirmation of attributes.
- Client: schema, data dictionary, comments (CRS) and approvals.


## 3.5 RACI per sheet

R = responsible (does it), A = accountable (owns the result), C = consulted, I = informed.

| Sheet | GIS Manager | GIS Lead | GIS Specialist |
|---|---|---|---|
| Projects | R / A | C | I |
| Project update sheet (creation) | R / A | I | I |
| Packages (plan, dates, client review) | A | R | C |
| Packages (GIS start, progress %, remarks) | I | A | R |
| Resources | A | R | I |
| Schema Tracker | I | A | R |
| Master Tracker (Dictionary, Subtypes, Domains) | A | C | R |
| QAQC | I | R / A | C |
| RFI Log | I | A | R |
| Updates | A | R | C |
| Risks | A | R | R |
| Dashboard, Delivery Tracker | R / A | I | I |
| Lists, Standards | R / A | I | I |


# 4. The workflow from project start to approval

The steps below are the practice workflow. Each step names the owner, the sheet and the columns to fill. The order matters: a step starts only when the previous one is complete.

| Step | Owner | Sheet | Output |
|---|---|---|---|
| 1. Register the project | GIS Manager | Projects, Report Template | Project row complete, update sheet created |
| 2. Set the stage gates | GIS Manager | Packages (skeleton rows) | One row per design stage with the agreed planned submission date |
| 3. Assign the lead and the team | GIS Manager, GIS Lead | Projects, Resources | GIS Lead set on the project, resources listed with allocation dates |
| 4. Plan the delivery | GIS Lead | Packages | One row per discipline per stage, dates, assigned staff |
| 5. Collect data and set the schema | GIS Specialist | Schema Tracker, Master Tracker | Feature class list of the client schema, dictionary current |
| 6. Produce and track progress | GIS Specialist, GIS Lead | Packages, Schema Tracker, RFI Log | Status and progress current, data gaps raised as RFIs |
| 7. QA/QC and submit | GIS Lead (reviewer) | QAQC, Packages | Checklist passed, submission dates recorded |
| 8. Client review | GIS Lead | Packages | Client review status, comment reference, revision, re-submission |
| 9. Report | GIS Lead | Updates, Risks | Three update blocks per project per period |
| 10. Progress meeting | GIS Manager | Dashboard, project update sheets, Delivery Tracker, Risks | Decisions and actions recorded as updates or risks |
| 11. Close | GIS Manager, GIS Lead | Projects, Packages | Status Completed, all links final |


## Step 1 - Register the project (GIS Manager)

1. Open Projects and type in the next empty row. Never leave a blank row between projects.
2. Fill: Project Name (exactly as the client and PM call it, this name is used in every dropdown), Client, Job No., Current Design Stage, Project Status, GIS Lead (leave empty until step 3), the stage columns MP to IFC (Approved, In Progress, Not Started or N/A for each stage), Project QA/QC Checklist link, RFI Log link, Remarks, Last Updated and GIS Data Share Folder (the project share folder path).
3. Create the project update sheet: right-click Report Template, Move or Copy, Create a copy, then rename the copy exactly to the name shown in the Report Sheet column of the Projects row. The sheet finds its project by that name and shows the status, stage chips, lead, packages, resources and updates by itself.
4. Check the Dashboard: the project appears in the status table with the chosen status.

*Figure 2 - Projects register, left part: identity, status, lead, region and the stage state columns.* (snapshot: projects.png)

*Figure 3 - Projects register, right part: calculated delivery columns, report sheet link and the GIS data share folder.* (snapshot: projects_right.png)


## Step 2 - Set the stage gates (GIS Manager)

1. Agree the submission date of each design stage with the Project Manager and the client. These dates are the GIS stage gates and they are the GIS Manager's responsibility.
2. In Packages add one skeleton row per design stage for the project: Project, Design Stage, Discipline = All Infrastructure Disciplines (or the single discipline when the scope is one discipline), Package / Description = stage gate, Status = Not Started, Planned Submission = the agreed date.
3. Record the same dates in the Projects Remarks when a date is provisional, and update the row when the client changes it.


## Step 3 - Assign the lead and the team (GIS Manager and GIS Lead)

1. Resource meeting: the GIS Manager presents the project and the stage gates; the regional lead confirms capacity from the resource deployment planning sheet.
2. After the green light, the GIS Manager sets GIS Lead on the Projects row.
3. The GIS Lead enters each team member in Resources: Name, Role, Hub, Project, Allocated From, Allocated To, Planned Hrs (period), Availability Next Period. The hub drives the GIS Resources Region on the Projects row and the Dashboard.

*Figure 4 - Resources: one row per person per project. Names entered here feed every person dropdown in the Hub.* (snapshot: resources.png)


## Step 4 - Plan the delivery (GIS Lead)

1. In Packages, split each stage gate into one row per discipline: Project, Design Stage, Discipline (pick one, or type several separated by commas), Package / Description, Dimension (2D, 3D or 2D & 3D), Status = Not Started, Planned Submission (on or before the stage gate), Assigned To (from the Resources list).
2. Keep the planned dates in line with the resource deployment plan: the person must be allocated to the project for the production window.
3. When the design is approved for a stage, fill Design Approval Date. GIS work starts only after that date; fill GIS Start Date when the team begins.
4. The Delivery Tracker sheet now shows the project on one page: pick the project in B4 and print or export to PDF for the PM.

*Figure 5 - Packages: one row per discipline package per design stage. Dark headers (group, keys) are calculated.* (snapshot: packages.png)

*Figure 6 - Delivery Tracker: the one-page view of the Packages rows of the project chosen in B4, with days overdue and overall progress.* (snapshot: delivery_tracker.png)


## Step 5 - Collect the data and set the schema (GIS Specialist)

1. Collect the design data from every discipline. First check ACC and the project share folder; take the data from there when it is already available, otherwise request it from the discipline and log the request in the RFI Log.
2. Open the client Master Tracker (for example QIC_Master_Tracker_AECOM.xlsx). Check that Dictionary, Subtypes and Domains match the latest client data dictionary. If the client issued a new schema, update them with the GIS Manager before going further.
3. In the Hub Schema Tracker, create the rows of the project: Project (pick it), Grouping Abbr, Grouping Name, Feature Class, Feature Class Alias and Geometry Type, exactly as in the client schema and data dictionary. For QIC the rows are pre-loaded under QIC - all projects: copy them and set the project name.
4. Keep the schema fields in the tracker identical to the client dictionary. The tracker is the agreed list of what we deliver.

*Figure 7 - Schema Tracker in the Hub: one row per feature class with availability, status, comments, source file link and share folder link.* (snapshot: schema_tracker.png)


## Step 6 - Produce and track progress (GIS Specialist and GIS Lead)

1. Schema Tracker: as data is collected and converted, fill Discipline, Discipline Individual (the person in the discipline who provided the data), Available / Unavailable, GIS Comments, Status (Not Started, In Progress, Delivered, Approved, N/A), Notes, Source File Link (where the source came from) and Share Folder Link (the project GIS share folder).
2. Packages: the specialist updates GIS Start Date, Progress % (steps of 10) and Remarks, and moves the Status from Not Started to In Progress to Internal QA/QC. The lead updates everything after that.
3. RFI Log: raise one row per question to a discipline or to the client (RFI No., Project, Design Stage, Discipline, Question, Raised By, Raised To, Date Raised, Due Date). When answered fill Response, Responded By, Response Date and set Status to Answered, then Closed. Overdue and RAG are calculated.
4. Risks: anyone adds a row when something threatens the plan (data late, schema change, resource gap) with Impact, Mitigation / Action, Owner, Support Needed From, Due Date, RAG and Status.

*Figure 8 - RFI Log: one row per request. Overdue and RAG are calculated and the counts flow to Projects, the Dashboard and the update pages.* (snapshot: rfi.png)


## Step 7 - QA/QC and submit (GIS Lead)

1. Before every submission the reviewer (GIS Lead or the QA/QC reviewer) fills one QAQC row: Project, Design Stage, Discipline, Package / Submission, Reviewer, Review Date and the eight checks (Coordinate System, Schema, Topology, Attributes, Naming, Metadata, Format, Internal Review) as Pass, Fail or N/A. Score and Result are calculated.
2. Only a Pass result goes to the client. A Fail goes back to the specialist with the comments.
3. On submission, the lead sets the Packages Status to Submitted, fills Actual Submission and Revision No. (R0 for the first issue) and the QA/QC Result.

*Figure 9 - QAQC: one checklist per submission; score and result are calculated.* (snapshot: qaqc.png)


## Step 8 - Client review (GIS Lead)

1. Record the client position in Packages: Client Review Status (Pending Submission, Under Review, Comments Issued, Re-Submission Required, Approved in Principle, Approved), Client Comment Ref. (the CRS reference) and the Packages Status (Client Comments while comments are open, Resubmitted after the re-issue, Approved at the end).
2. On each re-issue increase Revision No. (R1, R2 ...) and fill Re-Submission Date. On approval fill Approval Date.
3. Update the stage state on the Projects row (MP to IFC columns) when a whole stage is approved.


## Step 9 - Report (GIS Lead)

1. Before the bi-weekly meeting of the region, open Updates and add the rows of each project. Fill Meeting Date (the date of the meeting), Period From and Period To (the two weeks reported; pick from the list or type the dates), Project, Type, Description, Mitigation (for Concerns), Owner, Due Date, RAG, Entered By and Date Entered.
2. Write one row per item and keep it to one or two lines with facts, numbers and dates. Up to eight items per type per project per period appear on the update page.
3. The three types are the three blocks of the update page: Accomplishment = Accomplishment / Progress, Priority (Next 2 Weeks) = Priorities / Planned (Next 2 Weeks), Concern = Concerns and Mitigations (the Mitigation column is shown with the concern).
4. Review the project update sheet: the rows appear in the three blocks for the period selected on the Dashboard.

*Figure 10 - Updates: meeting date, period from and to, project, type, description, mitigation, owner, due date and RAG.* (snapshot: updates.png)


## Step 10 - Progress meeting (GIS Manager)

See section 7. The meeting walks through the Dashboard and then each project update sheet of the regions on the agenda.

*Figure 11 - Project update sheet: status, stage, lead, delivered and in-progress packages, resources, the three update blocks, trackers, stage progress and the delivery workflow band.* (snapshot: report_laheq.png)


## Step 11 - Close (GIS Manager and GIS Lead)

1. Set every package of the final stage to Approved with the Approval Date.
2. Set the Projects Status to Completed and the last stage column to Approved.
3. Check that the share folder link, the source file links and the final revision numbers are filled. The rows stay in the registers as the record of the project.


# 5. Sheet by sheet: what you fill and what is automatic

Each sheet follows the same convention: green headers are input, dark headers are calculated, grey cells are formulas, cream cells are selectors. The lists below name every column you are expected to fill and what the sheet does on its own.


## 5.1 Dashboard

- You fill: the report period in C4 (cream cell). Nothing else.
- Automatic: total, active, not started and at-risk projects; submissions this period; open client comments; open RFIs; team utilisation; open risks; overdue RFIs; the project status table; the charts.

*Figure 12 - Dashboard for the selected period.* (snapshot: dashboard.png)


## 5.2 Projects

- You fill (GIS Manager): #, Project Name, Client, Job No., Current Design Stage, Project Status, GIS Lead, MP to IFC stage states, Project QA/QC Checklist URL, RFI Log URL, Milestone Override (optional), Last Updated, Remarks, GIS Data Share Folder URL.
- Automatic: GIS Resources Region (from Resources), CRS Open / In Review / Closed / Total, RFI Open / Closed / Total (from the RFI Log), GIS Delivered / Approved, GIS In Progress, Next Milestone and its date (from Packages), Utilisation % (from Resources), Submissions This Period, Report Sheet name, Open Report link and the regional counters.
- Rule: Project Status is a strict list (Not Started, Progressing, At Risk, On Hold, Completed). A typed variant drops the project out of the Dashboard counts.


## 5.3 Packages

- GIS Lead fills: Project, Design Stage, Discipline, Package / Description, Dimension, Status, Planned Submission, Actual Submission, Approval Date, Assigned To, Design Approval Date, QA/QC Result, Client Review Status, Client Comment Ref., Revision No., Re-Submission Date.
- GIS Specialist fills: GIS Start Date, Progress %, Remarks, and Status up to Internal QA/QC.
- Automatic: Discipline Group (Infrastructure, Masterplan, Urban Planning, or Multiple when several disciplines are typed), the hidden key columns, the milestone date, the row colour per group and the status colours.
- Rule: the Design Stage dropdown accepts typed variants such as CD 50% - Concept Design 50%. Progress % is a strict list from 0 to 100 in steps of 10.


## 5.4 Delivery Tracker

- You fill: the project in B4, and the header cells Checked By, Approved By, Doc. No. and Rev. when printing for the PM or the client.
- Automatic: every row (one per package of the project), days overdue, totals per status, overall progress, the legend. Edit the data in Packages, never here.


## 5.5 Schema Tracker

- GIS Specialist fills: Project, Grouping Abbr, Grouping Name, Feature Class, Feature Class Alias, Geometry Type, Discipline, Discipline Individual, Available / Unavailable, GIS Comments, Status, Notes, Source File Link, Share Folder Link.
- Automatic: #, the availability colour (lime for Available, grey for Unavailable) and the status colour.
- Rule: the schema columns (Grouping Abbr to Geometry Type) must match the client data dictionary letter for letter. New clients: add rows with their project name; the QIC rows stay as the shared QIC schema.


## 5.6 Resources

- GIS Lead fills: Name, Role, Hub, Project, Allocated From, Allocated To, Planned Hrs (period), Actual Hrs (period), Availability Next Period, Remarks.
- Automatic: Utilisation %, the key, and the GIS Resources Region on Projects (more than one EC hub on a project = Mix EC Resources).
- Rule: every person who appears in Assigned To, Owner, Reviewer or Entered By must exist here first. The person dropdowns read this sheet.


## 5.7 Updates

- GIS Lead fills: Meeting Date, Period From, Period To, Project, Type, Description, Mitigation (for Concerns), Owner, Due Date, RAG, Entered By, Date Entered.
- Automatic: Report Period (from the two dates), the period bucket and the key that place the row on the right update page, the RAG colour.
- Rule: Period To may stay blank; it then equals Period From plus 13 days. Rows entered with any dates inside a standard period appear on that period's report.


## 5.8 Risks, RFI Log, QAQC, Standards, Innovation

- Risks: you fill Risk / Issue, Project, Impact, Mitigation / Action, Owner, Support Needed From, Due Date, RAG, Status, Date Raised. Automatic: #, colours, the open-risk count on the Dashboard.
- RFI Log: you fill RFI No., Project, Design Stage, Discipline, Question, Raised By, Raised To, Date Raised, Due Date, Response, Responded By, Response Date, Status, Remarks. Automatic: #, Overdue, RAG, the counts on Projects, the Dashboard and the update pages.
- QAQC: you fill Project, Design Stage, Discipline, Package / Submission, Reviewer, Review Date, the eight checks, Comments. Automatic: #, Score, Result, the checklist counts on the update pages.
- Standards: the GIS Manager fills Standard / Document, File Name, Version, Status, Owner, Purpose, Link. Automatic: #, Open link.
- Innovation: anyone fills Date, Category, Initiative, Description, Status, Owner, Benefit, Link.

*Figure 13 - Risks: only items that need a management decision or support.* (snapshot: risks.png)


## 5.9 Lists

- GIS Manager only. Every dropdown reads this sheet; add a value under the heading and it appears everywhere.
- Period calendar: S6 is the first period start. Every later period follows on automatically (previous end plus one day, each period 14 days) and can be overtyped when the calendar shifts. The labels in column R and the Dashboard selector follow.

*Figure 14 - Lists: dropdown sources and the bi-weekly period calendar.* (snapshot: lists.png)


# 6. The client Master Tracker

Each client schema has its own Master Tracker file. Today we have QIC_Master_Tracker_AECOM.xlsx. The file is the detailed record of the client data model and of what we have made available for it. The Hub Schema Tracker summarises the same feature classes per project for reporting.

| Sheet | What it holds | Who fills |
|---|---|---|
| Master Tracker | One row per feature class: Grouping Abbr, Grouping Name, Feature Class, Feature Class Alias, Geometry Type, Discipline, Discipline Individual, Available / Unavailable, GIS Comments, Status, Notes, Source File Link, Share Folder Link. KPI tiles on top: feature classes, available, unavailable, partial, approved, % available. | GIS Specialist; GIS Lead reviews |
| Dictionary | Every field of every feature class: name, alias, type, length, precision, domain, nullable, default, units. Generated from the client geodatabase. | GIS Specialist with the GIS Manager when the client schema changes |
| Subtypes | Subtype codes and names per feature class. | Same |
| Domains | Domain names, types and coded values. | Same |
| README | How to use and reuse the file. | GIS Manager |
| Lists | Dropdown sources: geometry, discipline, people, availability, status, projects. | GIS Manager |


## 6.1 Working in the Master Tracker

1. Set the project in C4 and the GIS lead and schema version in C5 and C6.
2. For each feature class pick Geometry, Discipline, Discipline Individual, Availability (Available, Unavailable, Partial, Not Required) and Status (Not Started, In Progress, Delivered, Client Review, Approved, On Hold). Typing is allowed for geometry, discipline and people.
3. Write GIS Comments for anything to confirm with the client, Notes for internal remarks, and paste the Source File Link and the Share Folder Link.
4. The KPI tiles, the row numbers and the colours update by themselves.


## 6.2 Setting it up for a new client

1. Copy the file and rename it <Client>_Master_Tracker_AECOM.xlsx.
2. Replace Dictionary, Subtypes and Domains with the output of GDBtoUniversalDD.pyt run on the client geodatabase, keeping the same column headings.
3. Clear rows 9 onwards of Master Tracker and paste the feature classes of the new schema in columns B to F. The common columns stay the same.
4. Add the client projects and people to the Lists sheet.
5. Mirror the feature classes in the Hub Schema Tracker with the project name.

*Figure 15 - Master Tracker: KPI tiles, feature classes, availability and status, with the source file and share folder link columns.* (snapshot: mt_master.png)

*Figure 16 - Dictionary: fields per feature class as generated from the client geodatabase.* (snapshot: mt_dictionary.png)

*Figure 17 - Domains: coded values of the client schema.* (snapshot: mt_domains.png)


# 7. The progress meeting


## 7.1 Cadence

- The GIS Manager holds the progress meeting every week.
- Each regional team reports every two weeks, so two regions are on the agenda each week. Example rotation: week A India and South Africa, week B Romania and Dubai. The GIS Manager publishes the rotation and the meeting dates.
- The reporting period of a region is the two weeks ending before its meeting. Period From and Period To in Updates carry those dates; the Dashboard period selector shows the matching standard period.

| When | Who | What |
|---|---|---|
| Two working days before the meeting | GIS Specialist | Packages progress and status, Schema Tracker, RFI Log current |
| One working day before the meeting | GIS Lead | Updates rows for every project of the region (three types), Resources utilisation, Risks |
| Meeting day, before the call | GIS Manager | Dashboard period set, project update sheets checked, Delivery Tracker of at-risk projects printed |
| Meeting | All | Walk through the project update sheets; decisions recorded as Priority rows or Risks |
| Within one day after | GIS Lead | Actions entered with owner and due date; At Risk status set where agreed |


## 7.2 Agenda (30 minutes per region)

1. Dashboard: KPIs of the period, projects At Risk or On Hold, overdue RFIs, open risks (5 minutes).
2. Project update sheets, one per project of the region. The meeting focuses on this page and on its three blocks: Accomplishment / Progress, Priorities / Planned (Next 2 Weeks), Concerns and Mitigations (15 minutes).
3. Delivery Tracker of any project with overdue packages (5 minutes).
4. Risks and support needed from management; decisions (5 minutes).


## 7.3 How to write the three blocks

- Accomplishment / Progress: what was delivered or finished in the period, with the stage, the discipline and the date. Example: IFC Electrical GIS resubmitted to RSG on 10-Sep-2026 with 3D Z values.
- Priorities / Planned (Next 2 Weeks): what will be delivered in the next period, with the owner and the due date. Example: Submit IFC Security and Telecom GIS by 12-Nov-2026 (Pankaj).
- Concerns and Mitigations: what threatens the plan, with the mitigation and the owner. Example: Duct junction-point rules still under negotiation with RSG; record the agreed rules in the MoM before resubmission (Ahmed Elfatih, 22-Oct-2026).
- One line per item, facts, numbers, dates, names. No narrative. RAG: Green on plan, Amber needs attention, Red needs a decision.
- A concern that needs management support is also a row in Risks with Support Needed From filled.

*Figure 18 - The blank update page. Every project gets one copy, named as in the Report Sheet column of Projects.* (snapshot: report_template.png)


# 8. What the Hub does for you

The Hub is a connected set of registers. You type in one place and the information appears everywhere it is needed. The list below is what you never have to do by hand.

- Project names typed once in Projects become the dropdown of every other sheet, the project selector of the Delivery Tracker and the name on the update sheet.
- People typed once in Resources become the person dropdowns of Packages, Updates, Risks, RFI Log, QAQC and the Schema Tracker.
- The Projects row derives the delivered and in-progress packages, the next milestone and its date, the CRS and RFI counts, the region and the utilisation.
- The update sheet of a project pulls status, client, stage, lead, hub, QA/QC and RFI counts, the packages, the resources, the three update blocks of the selected period, the stage chips and the workflow band.
- The Dashboard counts projects by status, submissions and open items for the period selected in C4.
- The Delivery Tracker rebuilds itself for the project chosen in B4, computes days overdue and overall progress.
- The Updates sheet turns Period From and Period To into the report period and places the row on the matching standard period, even when the dates are not the standard ones.
- RFI Overdue and RAG, QAQC Score and Result, Resources Utilisation, Schema Tracker numbering and colours, Package group and colours, Risk colours are all calculated.
- Conditional colours follow the AECOM palette: Earth Green approved or completed, lime delivered, orange in progress or comments, dark not started, grey on hold or not applicable.


# 9. Definitions


## 9.1 Package status

| Status | Meaning |
|---|---|
| Not Started | Row planned, no GIS work yet (design not approved or team not started) |
| In Progress | GIS production under way |
| Internal QA/QC | Produced, under internal review with a QAQC row |
| Submitted | Issued to the client (R0) |
| Client Comments | Client comments received and being addressed |
| Resubmitted | Re-issued after comments (R1 or later) |
| Approved | Client approval received |
| On Hold | Stopped by the client or the PM |
| Cancelled | Removed from scope; keep the row |


## 9.2 Project status

| Status | Meaning |
|---|---|
| Not Started | Registered, no package in progress |
| Progressing | On plan |
| At Risk | A stage gate or a package is likely to be late, or a blocking concern is open |
| On Hold | Stopped by the client or the PM |
| Completed | All stages approved |


## 9.3 Client review status

| Status | Meaning |
|---|---|
| Pending Submission | Not yet issued |
| Under Review | Issued, client reviewing |
| Comments Issued | CRS received |
| Re-Submission Required | Client asked for a re-issue |
| Approved in Principle | Accepted with minor comments |
| Approved | Final approval |


## 9.4 Schema tracker values

- Available / Unavailable: whether the design data for the feature class exists and was received. Partial and Not Required exist in the client Master Tracker.
- Status: Not Started, In Progress, Delivered, Approved, N/A (feature class not in scope for the project).
- Geometry Type: Point, Polyline, Polygon, Tabular, Annotation, Raster.
- Revision No.: R0 first issue, R1 to R5 re-issues.


## 9.5 Abbreviations

| Term | Meaning |
|---|---|
| ACC | Autodesk Construction Cloud, the project design data platform |
| CRS | Comment Resolution Sheet, the client comments register |
| RFI | Request for Information |
| Code B | Design data approved for use |
| MP, PC, CD, SD, DD, PFD, FD, IFC | Masterplan, Pre-Concept, Concept, Schematic, Detailed, Pre-Final, Final, Issued for Construction |
| EC hubs | The Enterprise Capability hubs: India, Romania, South Africa |
| RAG | Red, Amber, Green |


# 10. Checklists


## 10.1 GIS Manager

- New project: Projects row complete, update sheet created and named, stage gate rows in Packages, share folder link pasted.
- Resource meeting held, GIS Lead set on the project.
- Weekly: Dashboard period set, update sheets reviewed, risks decided, rotation published.
- Monthly: Lists reviewed, Standards current, client Master Trackers at the latest schema version.


## 10.2 GIS Lead

- Resources rows for every team member with allocation dates and hours.
- Packages: one row per discipline per stage, planned dates aligned with stage gates and the deployment plan, Assigned To filled.
- Weekly: Packages status, dates, client review columns current; QAQC row before every submission.
- Before the bi-weekly meeting: Updates rows for every project (three types), Risks current.


## 10.3 GIS Specialist

- Data collected from disciplines, ACC or the share folder; RFIs raised for gaps.
- Schema Tracker rows created from the client schema; Dictionary, Subtypes and Domains checked in the Master Tracker.
- Weekly: Schema Tracker availability, status, comments and links current; Packages GIS start, progress % and remarks current.
- Every source file and the project share folder linked in the tracker.


# 11. Governance and change

- Document owner: GIS Manager. Changes to this standard, to the Lists sheet, to the period calendar or to the file structure go through the GIS Manager.
- File version: the file name never changes. SharePoint version history is the backup; the GIS Manager restores a version if a sheet is damaged.
- Access: the GIS Practice team edits; PMs and management read. Share links, not copies.
- Requests for new columns, lists or sheets are raised as an Innovation row with the category Standards & Procedures.
- The GIS Hub application will replace these workbooks step by step. The sheets and column names in this standard are the specification of that application, so keep them as they are.
