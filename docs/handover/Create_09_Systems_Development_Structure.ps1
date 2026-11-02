# Creates the 09_Systems_Development folder structure with a README in every folder.
# Run in PowerShell:  .\Create_09_Systems_Development_Structure.ps1
# Existing folders and files are left untouched.
$root = "C:\Users\ElfatihA\OneDrive - AECOM\GIS_Practice_and_Project_Portfolio\09_Systems_Development"
$apps = @("01_Resource_Planner", "02_GIS_Practice_Hub")
$appSub = @{
  "01_Requirements" = "Source workbooks, notes and specifications that define the application."
  "02_Design" = "Data model, screen plans, design decks (HTML, PPTX)."
  "03_Source_Code" = "Code lives in GitHub. Keep only GitHub.url and one zip per tagged release. Never sync node_modules, .next or .git."
  "04_Deployment" = "Render notes, environment variable NAMES only (never values), runbook, backup procedure."
  "05_User_Guides_and_Training" = "User guide, video prompts, videos, training slides."
  "06_Data" = "Import workbooks and exports. Client data stays on AECOM systems."
  "07_Desktop_App" = "Installers and packaging notes when a desktop build exists."
  "08_Testing_and_Feedback" = "UAT checklists, test results, team feedback, issue list."
  "09_Releases" = "Release notes per version and change log."
}
$folders = @{
  "00_Governance\01_Standards" = "AECOM PPT and Word templates, brand.md, colour chart. The reference for every document."
  "00_Governance\02_Plans_and_Decisions" = "Split plan, decision log, meeting notes about the systems."
  "00_Governance\03_Roadmap" = "Phase plans, backlog, parked items."
  "00_Governance\04_Working_Standards" = "GIS-STD-001 Hub working standard and future standards."
  "03_Shared\01_API_Contracts" = "The JSON feed and the project-number link between the two applications."
  "03_Shared\02_Brand_Kit" = "Logo files, wordmark files, globals.css token list."
  "03_Shared\03_Scripts_and_Tools" = "Build scripts, workbook generators, utilities used for both applications."
  "03_Shared\04_Database" = "Schema diagrams and migration notes. No dumps with client data."
  "04_Archive" = "Superseded versions and retired pieces, dated in the file name."
}
foreach ($app in $apps) { foreach ($k in $appSub.Keys) { $folders["$app\$k"] = $appSub[$k] } }
foreach ($rel in ($folders.Keys | Sort-Object)) {
  $path = Join-Path $root $rel
  if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path | Out-Null }
  $readme = Join-Path $path "README.md"
  if (-not (Test-Path $readme)) { "# $($rel.Split('\')[-1])`r`n`r`n$($folders[$rel])`r`n" | Set-Content -Path $readme -Encoding UTF8 }
}
$rootReadme = Join-Path $root "README.md"
if (-not (Test-Path $rootReadme)) {
  "# 09_Systems_Development`r`n`r`nTwo applications (Resource Planner, GIS Practice Hub), one governance folder, one shared folder, one archive. Rules: code in GitHub only; no secrets; client data on AECOM systems; one current version per document; dates YYYY-MM-DD; no long dash.`r`n" | Set-Content -Path $rootReadme -Encoding UTF8
}
Write-Host "Folder structure ready under $root"
