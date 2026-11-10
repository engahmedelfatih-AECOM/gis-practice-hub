import { beforeAll, describe, expect, it } from "vitest";
import { registerExtras } from "@/application/hub/views";
import { resetDb, seedLists } from "./helpers";

/**
 * The register page reads the labels of its calculated columns from the first row, so an empty
 * register calls the extras with {}. This broke the live Updates page on 2026-11-10.
 */
describe("calculated columns of an empty register", () => {
  beforeAll(async () => {
    await resetDb();
    await seedLists();
  });

  it.each(["packages", "rfis", "qaqc", "resources", "updates"] as const)("%s: labels come out without a row", async (key) => {
    const extraOf = await registerExtras(key);
    const labels = Object.keys(extraOf({}));
    expect(labels.length).toBeGreaterThan(0);
  });
});
