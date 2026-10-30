import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * Minimal report layout on top of pdf-lib (no native dependencies, works in the standalone
 * image): titles, key-value lines, paragraphs and simple tables with AECOM colours.
 */
const GREEN = rgb(0, 0x87 / 255, 0x68 / 255);
const BLACK = rgb(0, 0, 0);
const GREY = rgb(0x64 / 255, 0x63 / 255, 0x63 / 255);
const LIGHT = rgb(0xf6 / 255, 0xf5 / 255, 0xf1 / 255);
const LINE = rgb(0xe3 / 255, 0xe3 / 255, 0xe3 / 255);

export class PdfReport {
  private doc!: PDFDocument;
  private font!: PDFFont;
  private bold!: PDFFont;
  private page!: PDFPage;
  private y = 0;
  readonly width = 842; // A4 landscape
  readonly height = 595;
  readonly margin = 36;
  private footer = "";

  static async create(footer: string): Promise<PdfReport> {
    const r = new PdfReport();
    r.doc = await PDFDocument.create();
    r.font = await r.doc.embedFont(StandardFonts.Helvetica);
    r.bold = await r.doc.embedFont(StandardFonts.HelveticaBold);
    r.footer = footer;
    r.doc.setTitle(footer);
    r.doc.setProducer("AECOM Resource Planner");
    r.newPage();
    return r;
  }

  private newPage(): void {
    this.page = this.doc.addPage([this.width, this.height]);
    this.page.drawRectangle({
      x: 0,
      y: this.height - 28,
      width: this.width,
      height: 28,
      color: GREEN,
    });
    this.page.drawText("AECOM", {
      x: this.margin,
      y: this.height - 19,
      size: 11,
      font: this.bold,
      color: rgb(1, 1, 1),
    });
    this.page.drawText(this.footer, {
      x: this.margin + 60,
      y: this.height - 19,
      size: 9,
      font: this.font,
      color: rgb(1, 1, 1),
    });
    this.page.drawText(`Page ${this.doc.getPageCount()}`, {
      x: this.width - this.margin - 40,
      y: 14,
      size: 8,
      font: this.font,
      color: GREY,
    });
    this.y = this.height - 28 - 24;
  }

  private ensure(h: number): void {
    if (this.y - h < this.margin + 10) this.newPage();
  }

  private clip(text: string, size: number, maxWidth: number, font = this.font): string {
    const safe = text.replace(/[^\x20-\x7e -ÿ]/g, "?");
    if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;
    let s = safe;
    while (s.length > 1 && font.widthOfTextAtSize(`${s}...`, size) > maxWidth) s = s.slice(0, -1);
    return `${s}...`;
  }

  title(text: string): void {
    this.ensure(26);
    this.page.drawText(this.clip(text, 16, this.width - 2 * this.margin, this.bold), {
      x: this.margin,
      y: this.y - 14,
      size: 16,
      font: this.bold,
      color: BLACK,
    });
    this.y -= 26;
  }

  heading(text: string): void {
    this.ensure(22);
    this.page.drawRectangle({
      x: this.margin,
      y: this.y - 16,
      width: this.width - 2 * this.margin,
      height: 16,
      color: LIGHT,
    });
    this.page.drawText(this.clip(text, 10, this.width - 2 * this.margin - 8, this.bold), {
      x: this.margin + 4,
      y: this.y - 12,
      size: 10,
      font: this.bold,
      color: GREEN,
    });
    this.y -= 22;
  }

  line(text: string, size = 9, color = BLACK): void {
    this.ensure(size + 5);
    this.page.drawText(this.clip(text, size, this.width - 2 * this.margin), {
      x: this.margin,
      y: this.y - size,
      size,
      font: this.font,
      color,
    });
    this.y -= size + 5;
  }

  /** Word-wrapped paragraph. */
  paragraph(text: string, size = 9): void {
    const maxWidth = this.width - 2 * this.margin;
    const words = text.split(/\s+/);
    let current = "";
    for (const w of words) {
      const next = current ? `${current} ${w}` : w;
      if (this.font.widthOfTextAtSize(next, size) > maxWidth) {
        this.line(current, size);
        current = w;
      } else current = next;
    }
    if (current) this.line(current, size);
  }

  keyValues(pairs: [string, string][], cols = 3): void {
    const colWidth = (this.width - 2 * this.margin) / cols;
    for (let i = 0; i < pairs.length; i += cols) {
      this.ensure(22);
      pairs.slice(i, i + cols).forEach(([k, v], j) => {
        const x = this.margin + j * colWidth;
        this.page.drawText(this.clip(k.toUpperCase(), 6.5, colWidth - 6, this.bold), {
          x,
          y: this.y - 7,
          size: 6.5,
          font: this.bold,
          color: GREY,
        });
        this.page.drawText(this.clip(v || "-", 9, colWidth - 6), {
          x,
          y: this.y - 18,
          size: 9,
          font: this.font,
          color: BLACK,
        });
      });
      this.y -= 24;
    }
  }

  /** Table with proportional column widths; rows may carry a fill colour (r, g, b in 0-1). */
  table(
    headers: string[],
    rows: string[][],
    opts: { widths?: number[]; fills?: ([number, number, number] | null)[]; size?: number } = {},
  ): void {
    const size = opts.size ?? 7.5;
    const total = this.width - 2 * this.margin;
    const weights = opts.widths ?? headers.map(() => 1);
    const sum = weights.reduce((a, b) => a + b, 0);
    const widths = weights.map((w) => (w / sum) * total);
    const rowH = size + 7;
    const drawRow = (
      cells: string[],
      bold: boolean,
      fillColor?: [number, number, number] | null,
    ) => {
      this.ensure(rowH);
      if (bold)
        this.page.drawRectangle({
          x: this.margin,
          y: this.y - rowH,
          width: total,
          height: rowH,
          color: BLACK,
        });
      else if (fillColor)
        this.page.drawRectangle({
          x: this.margin,
          y: this.y - rowH,
          width: total,
          height: rowH,
          color: rgb(...fillColor),
        });
      let x = this.margin;
      cells.forEach((c, i) => {
        this.page.drawText(this.clip(c ?? "", size, widths[i]! - 4, bold ? this.bold : this.font), {
          x: x + 2,
          y: this.y - rowH + 4,
          size,
          font: bold ? this.bold : this.font,
          color: bold ? rgb(1, 1, 1) : BLACK,
        });
        x += widths[i]!;
      });
      this.page.drawLine({
        start: { x: this.margin, y: this.y - rowH },
        end: { x: this.margin + total, y: this.y - rowH },
        thickness: 0.5,
        color: LINE,
      });
      this.y -= rowH;
    };
    drawRow(headers, true);
    rows.forEach((r, i) => drawRow(r, false, opts.fills?.[i] ?? null));
    this.y -= 6;
    if (!rows.length) this.line("None.", 8, GREY);
  }

  space(h = 8): void {
    this.y -= h;
  }

  async bytes(): Promise<Buffer> {
    return Buffer.from(await this.doc.save());
  }
}

/** Palette tints for list tones as 0-1 RGB triples. */
export const PDF_TONE_FILL: Record<string, [number, number, number] | null> = {
  none: null,
  grey: [0xed / 255, 0xed / 255, 0xed / 255],
  lime: [0xec / 255, 0xf3 / 255, 0xda / 255],
  amber: [0xff / 255, 0xf3 / 255, 0xce / 255],
  teal: [0xca / 255, 0xe7 / 255, 0xe8 / 255],
  green: [0xcf / 255, 0xdf / 255, 0xd7 / 255],
  red: [0xfb / 255, 0xd1 / 255, 0xbe / 255],
  black: [0xe3 / 255, 0xe3 / 255, 0xe3 / 255],
};
