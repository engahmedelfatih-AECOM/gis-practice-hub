import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TONE_CLASS } from "@/components/hub/tones";

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
