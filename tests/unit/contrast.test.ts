import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TONE_CLASS } from "@/components/hub/tones";
import { SIDEBAR_PANEL_ALPHA, SIDEBAR_TONES } from "@/components/layout/sidebar-tones";

/**
 * Contrast gate (proposal 12): every text and fill pair used for a status chip or a badge must
 * meet WCAG AA for normal text (4.5:1). The colours are read from the tokens in globals.css, so
 * a new token value or a new pair that is too pale fails the build.
 */
const css = readFileSync(path.resolve(import.meta.dirname, "../../src/app/globals.css"), "utf8");
const vars = new Map<string, string>();
for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars.set(m[1]!, m[2]!.replace(/\/\*.*?\*\//g, "").trim());

function resolve(name: string, depth = 0): string {
  const raw = vars.get(name);
  if (!raw || depth > 10) throw new Error(`Unknown colour token ${name}`);
  const ref = /^var\((--[\w-]+)\)$/.exec(raw);
  return ref ? resolve(ref[1]!, depth + 1) : raw;
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** "bg-earth-green text-white" to the two hex values behind the Tailwind colour tokens. */
function pair(classes: string): { bg: string; text: string } {
  const bg = /(?:^|\s)bg-([\w-]+)/.exec(classes)?.[1];
  const text = /(?:^|\s)text-([\w-]+)/.exec(classes)?.[1];
  if (!bg || !text) throw new Error(`No fill and text colour in "${classes}"`);
  return { bg: resolve(`--color-${bg}`), text: resolve(`--color-${text}`) };
}

const AA = 4.5;

describe("contrast of the status colours (WCAG AA, proposal 12)", () => {
  it.each(Object.entries(TONE_CLASS).filter(([, c]) => c))("workbook tone %s", (_tone, classes) => {
    const { bg, text } = pair(classes);
    expect(contrast(bg, text)).toBeGreaterThanOrEqual(AA);
  });

  it.each(["ok", "warn", "danger", "info", "neutral"])("badge tone %s", (tone) => {
    expect(contrast(resolve(`--color-status-${tone}-bg`), resolve(`--color-status-${tone}`))).toBeGreaterThanOrEqual(AA);
  });

  it("white text on the brand colour, links and muted text on the page surfaces", () => {
    const white = resolve("--color-white");
    expect(contrast(resolve("--color-brand-primary"), white)).toBeGreaterThanOrEqual(AA);
    expect(contrast(resolve("--color-brand-primary-hover"), white)).toBeGreaterThanOrEqual(AA);
    expect(contrast(resolve("--color-midnight-teal"), white)).toBeGreaterThanOrEqual(AA);
    for (const surface of ["--color-surface", "--color-surface-muted"]) {
      expect(contrast(resolve(surface), resolve("--color-brand-link"))).toBeGreaterThanOrEqual(AA);
      expect(contrast(resolve(surface), resolve("--color-gray-500"))).toBeGreaterThanOrEqual(AA);
      expect(contrast(resolve(surface), resolve("--color-gray-600"))).toBeGreaterThanOrEqual(AA);
    }
  });
});

/** Colour seen when `top` is laid over `bottom` at opacity `alpha` (0 to 1). */
function blend(top: string, bottom: string, alpha: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.replace("#", "").slice(i, i + 2), 16);
  return (
    "#" +
    [0, 2, 4]
      .map((i) => Math.round(alpha * ch(top, i) + (1 - alpha) * ch(bottom, i)).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** "bg-midnight-teal/85" to the token's hex value and 0.85. */
function fill(classes: string): { hex: string; alpha: number } {
  const m = /(?:^|\s|:)bg-([\w-]+?)(?:\/(\d+))?(?:\s|$)/.exec(classes);
  if (!m) throw new Error(`No fill in "${classes}"`);
  return { hex: resolve(`--color-${m[1]}`), alpha: m[2] ? Number(m[2]) / 100 : 1 };
}

describe("contrast of the glass navigation panel (WCAG AA)", () => {
  const panelFill = fill(SIDEBAR_TONES.panel);
  // The panel floats over the page surface; the glass is blended over it before measuring.
  const panel = blend(panelFill.hex, resolve("--color-surface-muted"), SIDEBAR_PANEL_ALPHA);
  const white = resolve("--color-white");

  it("the panel opacity in the class and in the constant agree", () => {
    expect(panelFill.alpha).toBe(SIDEBAR_PANEL_ALPHA);
  });

  it("white text on the panel, on a hovered row and on the active page pill", () => {
    expect(contrast(panel, white)).toBeGreaterThanOrEqual(AA);
    for (const tone of [SIDEBAR_TONES.hover, SIDEBAR_TONES.active]) {
      const f = fill(tone);
      expect(contrast(blend(f.hex, panel, f.alpha), white)).toBeGreaterThanOrEqual(AA);
    }
  });

  it("role names on the panel", () => {
    const text = resolve(`--color-${SIDEBAR_TONES.role.replace(/^text-/, "")}`);
    expect(contrast(panel, text)).toBeGreaterThanOrEqual(AA);
  });
});
