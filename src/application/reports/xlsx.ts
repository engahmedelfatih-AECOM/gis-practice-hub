import ExcelJS from "exceljs";

/**
 * Shared Excel styling for Hub exports: AECOM colours (Earth Green, black, white, palette tints)
 * and Arial, so every workbook the application writes looks like the templates.
 */
export const XLSX_COLOURS = {
  earthGreen: "FF008768",
  earthGreen25: "FFCFDFD7",
  limeGreen25: "FFECF3DA",
  midnightTeal: "FF00353E",
  oceanTeal: "FF009A9B",
  oceanTeal25: "FFCAE7E8",
  sunriseYellow: "FFFFCE00",
  sunriseYellow25: "FFFFF3CE",
  coralOrange25: "FFFBD1BE",
  stoneGray25: "FFF6F5F1",
  black: "FF000000",
  black10: "FFEDEDED",
  black15: "FFE3E3E3",
  white: "FFFFFFFF",
} as const;

/** Fill for a list tone (Administration > Hub lists). */
export const TONE_FILL: Record<string, string | null> = {
  none: null,
  grey: XLSX_COLOURS.black10,
  lime: XLSX_COLOURS.limeGreen25,
  amber: XLSX_COLOURS.sunriseYellow25,
  teal: XLSX_COLOURS.oceanTeal25,
  green: XLSX_COLOURS.earthGreen25,
  red: XLSX_COLOURS.coralOrange25,
  black: XLSX_COLOURS.black15,
};

export const FONT = "Arial";

export function newWorkbook(creator = "AECOM Resource Planner"): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = creator;
  wb.created = new Date();
  return wb;
}

export function fill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

export function styleTitle(cell: ExcelJS.Cell, size = 14): void {
  cell.font = { name: FONT, size, bold: true, color: { argb: XLSX_COLOURS.white } };
  cell.fill = fill(XLSX_COLOURS.earthGreen);
  cell.alignment = { vertical: "middle" };
}

export function styleSubtitle(cell: ExcelJS.Cell): void {
  cell.font = { name: FONT, size: 11, bold: true, color: { argb: XLSX_COLOURS.midnightTeal } };
}

export function styleLabel(cell: ExcelJS.Cell): void {
  cell.font = { name: FONT, size: 9, bold: true };
  cell.fill = fill(XLSX_COLOURS.stoneGray25);
}

export function styleHeader(cell: ExcelJS.Cell, dark = true): void {
  cell.font = {
    name: FONT,
    size: 9,
    bold: true,
    color: { argb: dark ? XLSX_COLOURS.white : XLSX_COLOURS.black },
  };
  cell.fill = fill(dark ? XLSX_COLOURS.black : XLSX_COLOURS.earthGreen25);
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = thinBorder();
}

export function styleCell(cell: ExcelJS.Cell, toneFill?: string | null): void {
  cell.font = { name: FONT, size: 9 };
  cell.alignment = { vertical: "middle", wrapText: true };
  cell.border = thinBorder();
  if (toneFill) cell.fill = fill(toneFill);
}

export function thinBorder(): Partial<ExcelJS.Borders> {
  const side: ExcelJS.Border = { style: "thin", color: { argb: XLSX_COLOURS.black15 } };
  return { top: side, left: side, bottom: side, right: side };
}

/** Write a header row and data rows starting at `startRow`; returns the next free row. */
export function writeTable(
  ws: ExcelJS.Worksheet,
  startRow: number,
  startCol: number,
  headers: string[],
  rows: (string | number | null | undefined)[][],
  opts: { rowFills?: (string | null)[]; dateCols?: number[] } = {},
): number {
  headers.forEach((h, i) => {
    const c = ws.getCell(startRow, startCol + i);
    c.value = h;
    styleHeader(c);
  });
  ws.getRow(startRow).height = 30;
  rows.forEach((r, ri) => {
    r.forEach((v, ci) => {
      const c = ws.getCell(startRow + 1 + ri, startCol + ci);
      c.value = v === undefined ? null : v;
      styleCell(c, opts.rowFills?.[ri] ?? null);
      if (opts.dateCols?.includes(ci) && typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
        c.value = new Date(`${v}T00:00:00Z`);
        c.numFmt = "dd-mmm-yy";
      }
    });
  });
  return startRow + 1 + rows.length;
}

export async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}
