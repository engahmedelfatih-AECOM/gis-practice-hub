import "server-only";
import { REGISTERS, type RegisterKey } from "@/domain/hub/registers";
import { UPDATE_TYPES, UPDATE_TYPE_BLOCKS } from "@/domain/shared/enums";
import { stageCode } from "@/domain/hub/rules";
import type { Actor } from "@/application/auth/actor";
import { assertCan } from "@/application/shared/guard";
import { PdfReport, PDF_TONE_FILL } from "@/application/reports/pdf";
import { TONE_FILL, XLSX_COLOURS, fill, newWorkbook, styleCell, styleLabel, styleSubtitle, styleTitle, workbookToBuffer, writeTable } from "@/application/reports/xlsx";
import { listRows } from "./registers";
import { deliveryTracker, projectPage, registerExtras } from "./views";

/** Fill tone of a workbook value (the sheet colours) for Excel and PDF exports. */
function toneKey(v: string | null | undefined): string {
  switch (v) {
    case "Approved":
    case "Progressing":
      return "green";
    case "Submitted":
    case "Resubmitted":
    case "Delivered":
    case "Green":
    case "Pass":
    case "Available":
    case "Closed":
      return "lime";
    case "In Progress":
    case "Internal QA/QC":
    case "At Risk":
    case "Amber":
    case "Open":
    case "Partial":
      return "amber";
    case "Client Comments":
    case "Red":
    case "Fail":
      return "red";
    case "Not Started":
    case "Completed":
      return "black";
    case "On Hold":
    case "Cancelled":
    case "N/A":
    case "Unavailable":
      return "grey";
    case "Under Review":
    case "Answered":
    case "Monitoring":
      return "teal";
    default:
      return "none";
  }
}

/** A register as an Excel sheet in the workbook layout (sheet columns plus the calculated ones). */
export async function exportRegister(actor: Actor, key: RegisterKey, projectId?: string | null): Promise<{ buffer: Buffer; fileName: string }> {
  assertCan(actor, "export:run");
  const def = REGISTERS[key];
  const rows = await listRows(actor, key, { projectId });
  const extraFn = ["packages", "rfis", "qaqc", "resources", "updates"].includes(key) ? await registerExtras(key as "packages") : null;
  const extraLabels = extraFn ? Object.keys(extraFn(rows[0] ?? {})) : [];
  // Calculated columns of the workbook are written once, from the derivations, not as empty cells.
  const columns = def.fields.filter((f) => !f.derived);
  const wb = newWorkbook("AECOM GIS Practice Hub");
  const ws = wb.addWorksheet(def.sheet.slice(0, 31));
  ws.getCell("B1").value = def.sheet.toUpperCase();
  styleTitle(ws.getCell("B1"));
  ws.mergeCells(1, 2, 1, Math.max(3, columns.length + extraLabels.length + 1));
  ws.getCell("B2").value = def.description;
  styleSubtitle(ws.getCell("B2"));
  const headers = ["#", ...columns.map((f) => f.label), ...extraLabels];
  const dateCols = columns.map((f, i) => (f.type === "date" ? i + 1 : -1)).filter((i) => i >= 0);
  const data = rows.map((r, i) => [
    i + 1,
    ...columns.map((f) => {
      const v = r[f.key];
      if (f.type === "project") return (r.projectName as string) ?? null;
      if (f.type === "pct") return v === null || v === undefined ? null : Number(v) / 100;
      return v === null || v === undefined ? null : typeof v === "number" ? v : String(v);
    }),
    ...(extraFn ? Object.values(extraFn(r)).map((x) => (x === "" ? null : (x as string))) : []),
  ]);
  const end = writeTable(ws, 4, 1, headers, data, { dateCols });
  // colour the status-like cells as the sheet does
  rows.forEach((r, ri) => {
    columns.forEach((f, ci) => {
      if (f.type !== "select") return;
      const f2 = TONE_FILL[toneKey(r[f.key] as string)];
      if (f2) ws.getCell(5 + ri, 2 + ci).fill = fill(f2);
      if (toneKey(r[f.key] as string) === "black") ws.getCell(5 + ri, 2 + ci).font = { name: "Arial", size: 9, color: { argb: XLSX_COLOURS.white } };
    });
    columns.forEach((f, ci) => {
      if (f.type === "pct") ws.getCell(5 + ri, 2 + ci).numFmt = "0%";
    });
  });
  ws.views = [{ state: "frozen", ySplit: 4, xSplit: 2 }];
  ws.columns.forEach((c, i) => {
    c.width = i === 0 ? 5 : Math.min(48, Math.max(12, (headers[i]?.length ?? 10) + 4));
  });
  void end;
  return { buffer: await workbookToBuffer(wb), fileName: `${def.sheet.replace(/\s+/g, "_")}.xlsx` };
}

/** The project update page as a one-sheet workbook or a one-page PDF. */
export async function exportReport(actor: Actor, projectId: string, periodId: string | null, format: "xlsx" | "pdf"): Promise<{ buffer: Buffer; fileName: string }> {
  assertCan(actor, "export:run");
  const page = await projectPage(actor, projectId, periodId);
  const p = page.project;
  const title = `PROJECT UPDATE - ${p.name.toUpperCase()}${p.client ? ` (${p.client.toUpperCase()})` : ""}`;
  const periodLabel = page.period?.label ?? "-";
  const base = `${p.name.replace(/[^A-Za-z0-9]+/g, "_")}_update_${page.period?.startDate ?? "period"}`;
  if (format === "xlsx") {
    const wb = newWorkbook("AECOM GIS Practice Hub");
    const ws = wb.addWorksheet("Project update");
    ws.getCell("B1").value = title;
    styleTitle(ws.getCell("B1"), 16);
    ws.mergeCells("B1:L1");
    ws.getCell("B2").value = `GIS Practice | Bi-weekly report | ${periodLabel} | Status: ${p.status}`;
    styleSubtitle(ws.getCell("B2"));
    const tiles: [string, string][] = [
      ["Client", p.client ?? "-"],
      ["Design stage", stageCode(p.currentDesignStage) || "-"],
      ["Report period", periodLabel],
      ["GIS lead / hub", `${p.gisLead ?? "-"} - ${p.region}`],
      ["QA/QC checklists", `${page.qaqc.checklists} checklists, ${page.qaqc.pass} pass, ${page.qaqc.fail} fail`],
      ["RFI log", `${p.rfi.open} open (${p.rfi.overdue} overdue), ${p.rfi.closed} closed`],
    ];
    tiles.forEach(([k, v], i) => {
      const l = ws.getCell(4, 2 + i * 2);
      l.value = k;
      styleLabel(l);
      const c = ws.getCell(5, 2 + i * 2);
      c.value = v;
      styleCell(c, XLSX_COLOURS.earthGreen25);
    });
    let row = 7;
    ws.getCell(row, 2).value = "GIS Data Delivered / Approved";
    styleSubtitle(ws.getCell(row, 2));
    row = writeTable(ws, row + 1, 2, ["Stage", "Discipline", "Package", "Status"], page.delivered.map((x) => [stageCode(x.designStage), x.discipline, x.description ?? "", x.status]), {
      rowFills: page.delivered.map((x) => TONE_FILL[toneKey(x.status)] ?? null),
    });
    row += 1;
    ws.getCell(row, 2).value = "GIS Data In Progress";
    styleSubtitle(ws.getCell(row, 2));
    row = writeTable(ws, row + 1, 2, ["Stage", "Discipline", "Package", "Status"], page.inProgress.map((x) => [stageCode(x.designStage), x.discipline, x.description ?? "", x.status]), {
      rowFills: page.inProgress.map((x) => TONE_FILL[toneKey(x.status)] ?? null),
    });
    row += 1;
    ws.getCell(row, 2).value = "GIS Resources on Project";
    styleSubtitle(ws.getCell(row, 2));
    row = writeTable(ws, row + 1, 2, ["Name", "Role", "Hub"], page.resources.map((r) => [r.name, r.role ?? "", r.hub ?? ""]));
    for (const t of UPDATE_TYPES) {
      row += 1;
      ws.getCell(row, 2).value = UPDATE_TYPE_BLOCKS[t];
      styleSubtitle(ws.getCell(row, 2));
      row = writeTable(ws, row + 1, 2, ["#", "Item", "Mitigation", "Owner", "Due", "RAG"], page.blocks[t].map((u, i) => [i + 1, u.description, u.mitigation ?? "", u.owner ?? "", u.dueDate ?? "", u.rag ?? ""]), {
        dateCols: [4],
        rowFills: page.blocks[t].map((u) => TONE_FILL[toneKey(u.rag)] ?? null),
      });
    }
    row += 1;
    ws.getCell(row, 2).value = "Tracker";
    styleSubtitle(ws.getCell(row, 2));
    row = writeTable(ws, row + 1, 2, ["Tracker", "Open", "In Review", "Closed", "Total"], [
      ["Client Comments (CRS)", p.crsOpen, p.crsInReview, p.crsClosed, p.crsTotal],
      ["RFIs to Disciplines", p.rfi.open, "-", p.rfi.closed, p.rfi.total],
    ]);
    row += 1;
    ws.getCell(row, 2).value = "Design Stage Progress";
    styleSubtitle(ws.getCell(row, 2));
    page.stageChips.forEach((c, i) => {
      const cell = ws.getCell(row + 1, 2 + i);
      cell.value = `${c.code}: ${c.state || "-"}`;
      styleCell(cell, TONE_FILL[toneKey(c.state)] ?? null);
    });
    row += 3;
    ws.getCell(row, 2).value = "GIS delivery workflow";
    styleSubtitle(ws.getCell(row, 2));
    row = writeTable(ws, row + 1, 2, ["#", "Step", "Status"], page.workflow.map((s) => [s.stepNo, s.name, s.status]), {
      rowFills: page.workflow.map((s) => TONE_FILL[s.status === "Completed" ? "lime" : s.status === "In Progress" ? "amber" : "grey"] ?? null),
    });
    ws.columns.forEach((c, i) => (c.width = i === 0 ? 2 : i === 2 || i === 3 ? 40 : 18));
    return { buffer: await workbookToBuffer(wb), fileName: `${base}.xlsx` };
  }
  const pdf = await PdfReport.create(`GIS Practice Hub - ${p.name} - ${periodLabel}`);
  pdf.title(title);
  pdf.line(`GIS Practice | Bi-weekly report | ${periodLabel} | Status: ${p.status}`, 9);
  pdf.line(`Client: ${p.client ?? "-"}   Design stage: ${stageCode(p.currentDesignStage) || "-"}   GIS lead / hub: ${p.gisLead ?? "-"} - ${p.region}`, 9);
  pdf.line(`QA/QC: ${page.qaqc.checklists} checklists, ${page.qaqc.pass} pass, ${page.qaqc.fail} fail   RFIs: ${p.rfi.open} open (${p.rfi.overdue} overdue), ${p.rfi.closed} closed   CRS: ${p.crsOpen} open, ${p.crsInReview} in review, ${p.crsClosed} closed`, 9);
  pdf.heading("GIS Data Delivered / Approved");
  pdf.table(["Stage", "Discipline", "Package", "Status"], page.delivered.map((x) => [stageCode(x.designStage), x.discipline, x.description ?? "", x.status]), { widths: [1, 3, 3, 2], fills: page.delivered.map((x) => PDF_TONE_FILL[toneKey(x.status)] ?? null) });
  pdf.heading("GIS Data In Progress");
  pdf.table(["Stage", "Discipline", "Package", "Status"], page.inProgress.map((x) => [stageCode(x.designStage), x.discipline, x.description ?? "", x.status]), { widths: [1, 3, 3, 2], fills: page.inProgress.map((x) => PDF_TONE_FILL[toneKey(x.status)] ?? null) });
  pdf.heading("GIS Resources on Project");
  pdf.table(["Name", "Role", "Hub"], page.resources.map((r) => [r.name, r.role ?? "", r.hub ?? ""]), { widths: [3, 3, 2] });
  for (const t of UPDATE_TYPES) {
    pdf.heading(UPDATE_TYPE_BLOCKS[t]);
    pdf.table(["#", "Item", "Mitigation", "Owner", "Due", "RAG"], page.blocks[t].map((u, i) => [String(i + 1), u.description, u.mitigation ?? "", u.owner ?? "", u.dueDate ?? "", u.rag ?? ""]), { widths: [0.4, 5, 3, 1.5, 1.2, 0.8], fills: page.blocks[t].map((u) => PDF_TONE_FILL[toneKey(u.rag)] ?? null) });
  }
  pdf.heading("Design Stage Progress");
  pdf.line(page.stageChips.map((c) => `${c.code}: ${c.state || "-"}`).join("    "), 9);
  pdf.heading("GIS delivery workflow");
  pdf.table(["#", "Step", "Status"], page.workflow.map((s) => [String(s.stepNo), s.name, s.status]), { widths: [0.4, 5, 1.5], fills: page.workflow.map((s) => PDF_TONE_FILL[s.status === "Completed" ? "lime" : s.status === "In Progress" ? "amber" : "grey"] ?? null) });
  return { buffer: await pdf.bytes(), fileName: `${base}.pdf` };
}

const TRACKER_HEAD = ["#", "Discipline (stage)", "Design Approval Date", "GIS Start Date", "Planned Submission", "Actual Submission", "Assigned Staff", "QA/QC", "GIS Status", "Client Review Status", "Client Comment Ref. No.", "Revision No.", "Re-Submission Date", "Client Final Approval Date", "Days Overdue", "Progress (%)", "Remarks / Notes"];

/** The Delivery Tracker of a project in the Laheq layout, as Excel or PDF. */
export async function exportTracker(actor: Actor, projectId: string, format: "xlsx" | "pdf"): Promise<{ buffer: Buffer; fileName: string }> {
  assertCan(actor, "export:run");
  const t = await deliveryTracker(actor, projectId);
  const base = `${t.project.name.replace(/[^A-Za-z0-9]+/g, "_")}_GIS_Tracker`;
  const rows = t.rows.map((r) => [r.n, r.disciplineStage, r.designApprovalDate, r.gisStartDate, r.plannedSubmission, r.actualSubmission, r.assignedTo, r.qaqcResult, r.status, r.clientReviewStatus, r.clientCommentRef, r.revisionNo, r.resubmissionDate, r.approvalDate, r.daysOverdue, r.progressPct === null ? null : r.progressPct / 100, r.remarks]);
  const s = t.summary;
  if (format === "xlsx") {
    const wb = newWorkbook("AECOM GIS Practice Hub");
    const ws = wb.addWorksheet("Delivery Tracker");
    ws.getCell("B1").value = `GIS SUBMISSION TRACKER - ${t.project.name.toUpperCase()}`;
    styleTitle(ws.getCell("B1"), 14);
    ws.mergeCells("B1:Q1");
    ws.getCell("B2").value = `Client: ${t.project.client ?? "-"}  |  GIS lead: ${t.gisLead ?? "-"}  |  All disciplines - one row per package`;
    styleSubtitle(ws.getCell("B2"));
    const meta: [string, string][] = [["Project:", t.project.name], ["Client:", t.project.client ?? "-"], ["Consultant:", "AECOM"], ["Prepared By:", "GIS Practice"], ["Date:", t.today], ["Status:", "Live"]];
    meta.forEach(([k, v], i) => {
      const l = ws.getCell(4, 2 + i * 2);
      l.value = k;
      styleLabel(l);
      const c = ws.getCell(4, 3 + i * 2);
      c.value = v;
      styleCell(c);
    });
    ws.getCell("B6").value = "NOTE: GIS activities commence only upon receipt of the design approval from the discipline.";
    ws.getCell("B6").font = { name: "Arial", size: 8, italic: true };
    const end = writeTable(ws, 8, 1, TRACKER_HEAD, rows, { dateCols: [2, 3, 4, 5, 12, 13], rowFills: t.rows.map((r) => TONE_FILL[toneKey(r.status)] ?? null) });
    t.rows.forEach((_, i) => (ws.getCell(9 + i, 16).numFmt = "0%"));
    const totals: [string, string | number][] = [["TOTAL PACKAGES:", s.total], ["APPROVED:", s.approved], ["SUBMITTED:", s.submitted], ["IN PROGRESS:", s.inProgress], ["NOT STARTED:", s.notStarted], ["OVERALL PROGRESS:", `${s.overallProgress} %`]];
    totals.forEach(([k, v], i) => {
      const l = ws.getCell(end + 1, 1 + i * 3);
      l.value = k;
      styleLabel(l);
      const c = ws.getCell(end + 1, 2 + i * 3);
      c.value = v;
      styleCell(c, XLSX_COLOURS.earthGreen25);
    });
    ws.columns.forEach((c, i) => (c.width = i === 0 ? 4 : i === 1 ? 30 : i === 16 ? 36 : 14));
    ws.views = [{ state: "frozen", ySplit: 8 }];
    return { buffer: await workbookToBuffer(wb), fileName: `${base}.xlsx` };
  }
  const pdf = await PdfReport.create(`GIS Practice Hub - ${t.project.name} - Delivery Tracker`);
  pdf.title(`GIS SUBMISSION TRACKER - ${t.project.name.toUpperCase()}`);
  pdf.line(`Client: ${t.project.client ?? "-"}   GIS lead: ${t.gisLead ?? "-"}   Consultant: AECOM   Prepared by: GIS Practice   Date: ${t.today}`, 9);
  pdf.table(
    TRACKER_HEAD,
    rows.map((r) => r.map((c, i) => (i === 15 ? `${Math.round(Number(c) * 100)} %` : c === null || c === undefined ? "" : String(c)))),
    { widths: [0.4, 2.4, 1.1, 1.1, 1.1, 1.1, 1.4, 0.8, 1.3, 1.4, 1.1, 0.8, 1.1, 1.1, 0.8, 0.9, 2.2], size: 6.5, fills: t.rows.map((r) => PDF_TONE_FILL[toneKey(r.status)] ?? null) },
  );
  pdf.line(`Total ${s.total}   Approved ${s.approved}   Submitted ${s.submitted}   In progress ${s.inProgress}   Not started ${s.notStarted}   Overall progress ${s.overallProgress} %`, 9);
  return { buffer: await pdf.bytes(), fileName: `${base}.pdf` };
}
