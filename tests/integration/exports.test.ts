import { readFileSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it } from "vitest";
import { exportRegister, exportReport, exportTracker } from "@/application/hub/exports";
import { importHubWorkbook } from "@/application/hub/import";
import { projectsView } from "@/application/hub/views";
import { admin, resetDb, viewer } from "./helpers";

beforeEach(resetDb);

describe("exports", () => {
  it("writes the registers, the update page and the tracker as Excel and PDF", async () => {
    const a = await admin();
    await importHubWorkbook(a, { name: "hub.xlsx", buffer: readFileSync(path.join(process.cwd(), "tests/fixtures/GIS_Practice_Hub_sample.xlsx")) }, false);
    const v = await viewer();
    const { rows } = await projectsView(v);
    const laheq = rows.find((r) => r.name === "Laheq Island")!;

    const reg = await exportRegister(v, "packages", laheq.id);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(reg.buffer as never);
    const ws = wb.getWorksheet("Packages")!;
    expect(ws.getCell("B1").value).toBe("PACKAGES");
    expect(ws.getCell("B4").value).toBe("Project");
    expect(ws.rowCount).toBeGreaterThanOrEqual(10);

    const xlsx = await exportReport(v, laheq.id, null, "xlsx");
    expect(xlsx.fileName).toMatch(/Laheq_Island_update_.*\.xlsx$/);
    const pdf = await exportReport(v, laheq.id, null, "pdf");
    expect(pdf.buffer.subarray(0, 4).toString()).toBe("%PDF");

    const tx = await exportTracker(v, laheq.id, "xlsx");
    const twb = new ExcelJS.Workbook();
    await twb.xlsx.load(tx.buffer as never);
    const tws = twb.getWorksheet("Delivery Tracker")!;
    expect(String(tws.getCell("B1").value)).toContain("GIS SUBMISSION TRACKER - LAHEQ ISLAND");
    expect(tws.getCell("B8").value).toBe("Discipline (stage)");
    const tpdf = await exportTracker(v, laheq.id, "pdf");
    expect(tpdf.buffer.length).toBeGreaterThan(1000);
  });
});
