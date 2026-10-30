import { describe, expect, it } from "vitest";
import { formatDate, formatHours, formatPct, humanise } from "@/lib/format";

describe("formatting (plan §12: consistent formats)", () => {
  it("dates as DD MMM YYYY", () => {
    expect(formatDate("2026-11-02")).toBe("02 Nov 2026");
    expect(formatDate(null)).toBe("-");
  });
  it("hours to one decimal", () => {
    expect(formatHours(22.4)).toBe("22.4 h");
    expect(formatHours("16")).toBe("16.0 h");
  });
  it("percentages to zero decimals", () => {
    expect(formatPct(139.6)).toBe("140 %");
    expect(formatPct(Number.NaN)).toBe("-");
  });
  it("humanises enum values", () => {
    expect(humanise("ON_HOLD")).toBe("On hold");
  });
});
