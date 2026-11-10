import { describe, expect, it } from "vitest";
import { dockScale } from "@/components/layout/use-sidebar";

describe("dock magnification of the navigation icons", () => {
  it("is largest under the pointer and falls off with distance", () => {
    expect(dockScale(0)).toBeCloseTo(1.5);
    expect(dockScale(36)).toBeLessThan(dockScale(0));
    expect(dockScale(36)).toBeGreaterThan(dockScale(72));
    expect(dockScale(-36)).toBeCloseTo(dockScale(36));
  });

  it("is back to normal size beyond the range", () => {
    expect(dockScale(110)).toBeCloseTo(1);
    expect(dockScale(400)).toBe(1);
  });
});
