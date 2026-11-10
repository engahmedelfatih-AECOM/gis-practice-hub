import postgres from "postgres";
import { expect, test, type Page } from "@playwright/test";

/**
 * One walk-through per role, on the sample workbook. The accounts come from
 * `scripts/demo-accounts.ts` (DEMO_ACCOUNTS_PASSWORD) and the data from
 * `scripts/import-sample.ts`, so the suite runs on sample data only.
 *
 * Covered here (report 2026-11-02, section 6):
 * - what each role may see and may not see,
 * - a GIS Specialist saving the progress fields of a package (B3, M8),
 * - a region-scoped GIS Lead seeing only the projects their hub works on (B2).
 */
const PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "Demo-Local-Only-12345!";
const ACCOUNTS = {
  manager: "manager.demo@aecom.com",
  lead: "lead.demo@aecom.com",
  specialist: "specialist.demo@aecom.com",
  viewer: "viewer.demo@aecom.com",
  indiaLead: "lead.india.demo@aecom.com",
};

/**
 * The sign-in rate limit is 5 attempts a minute for an IP address, and this spec signs in six
 * times, so the counters are cleared before each sign-in. The limit itself stays in force.
 */
async function clearRateLimit() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const sql = postgres(url, { max: 1, onnotice: () => undefined });
  try {
    await sql`delete from auth_rate_limit`;
  } finally {
    await sql.end();
  }
}

async function signIn(page: Page, email: string) {
  await clearRateLimit();
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Work e-mail").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /GIS PRACTICE HUB - DASHBOARD/ })).toBeVisible();
}

/** The access-denied panel the server renders for a forbidden page. */
const DENIED = /Access denied/;

/** Value of one Dashboard tile, by its caption. */
async function kpi(page: Page, label: string): Promise<number> {
  const value = page.getByText(label, { exact: true }).locator("xpath=preceding-sibling::p[1]");
  return Number((await value.innerText()).replace(/[^\d.]/g, ""));
}

test.describe("Role walk-through on the sample workbook", () => {
  test("the GIS Manager reaches the registers an owner needs", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, ACCOUNTS.manager);
    for (const path of ["/projects", "/packages", "/resources", "/updates", "/standards", "/risks"]) {
      await page.goto(path);
      await expect(page.getByText(DENIED), path).toHaveCount(0);
    }
    // Administration belongs to the Administrator, not to the manager.
    await page.goto("/admin/users");
    await expect(page.getByText(DENIED)).toBeVisible();
  });

  test("the GIS Manager fills the Project Number of an existing project", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, ACCOUNTS.manager);
    await page.goto("/projects");
    await page.getByRole("link", { name: "Project numbers" }).click();
    await expect(page.getByRole("heading", { name: "Project numbers" })).toBeVisible();
    const number = `E2E-${Date.now().toString().slice(-6)}`;
    await page.getByLabel("Project Number of QIC D9", { exact: true }).fill(number);
    await page.getByRole("button", { name: "Save numbers" }).click();
    await expect(page.getByText("1 project number saved.")).toBeVisible();
    // The number is on the register, and a second project cannot take it.
    await page.goto("/projects");
    await expect(page.getByRole("cell", { name: number, exact: true })).toBeVisible();
    await page.goto("/projects/numbers");
    await page.getByLabel("Project Number of Masdar City", { exact: true }).fill(number);
    await page.getByRole("button", { name: "Save numbers" }).click();
    await expect(page.getByText(/typed on two projects/)).toBeVisible();
  });

  test("the Viewer reads the Hub and cannot change a row", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, ACCOUNTS.viewer);
    await page.goto("/projects");
    await expect(page.getByRole("link", { name: "Add row" })).toHaveCount(0);
    await page.goto("/packages");
    await page.getByRole("link", { name: /^Edit / }).first().click();
    await expect(page).toHaveURL(/\/packages\/[0-9a-f-]+$/);
    // The form renders for reading only: no Save, and every control disabled.
    await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Read only" })).toBeVisible();
    await expect(page.getByLabel("Progress %")).toBeDisabled();
  });

  test("the GIS Specialist saves the progress fields and cannot plan the package", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, ACCOUNTS.specialist);
    await page.goto("/packages");
    await page.getByRole("link", { name: /^Edit / }).first().click();
    await expect(page).toHaveURL(/\/packages\/[0-9a-f-]+$/);
    const rowUrl = page.url();

    // The plan fields are read-only for a specialist, the progress fields are not.
    await expect(page.getByLabel("Planned Submission")).toBeDisabled();
    await expect(page.getByLabel("Design Stage")).toBeDisabled();
    await expect(page.getByLabel("Progress %")).toBeEnabled();
    await expect(page.getByLabel("Remarks")).toBeEnabled();

    // The status list stops at Internal QA/QC: nothing after it is offered, except the row's
    // current status, which stays selectable so a save does not clear it.
    const current = await page.getByLabel(/^Status/).inputValue();
    const statuses = (await page.getByLabel(/^Status/).locator("option").allInnerTexts())
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("Choose"))
      .sort();
    const expected = [...new Set(["In Progress", "Internal QA/QC", "Not Started", ...(current ? [current] : [])])].sort();
    expect(statuses).toEqual(expected);

    const remark = `Specialist e2e ${Date.now().toString().slice(-6)}`;
    await page.getByLabel("Progress %").selectOption("60");
    await page.getByLabel(/^Status/).selectOption("Internal QA/QC");
    await page.getByLabel("Remarks").fill(remark);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(/\/packages\?saved=1/);

    // The values are stored, not swallowed.
    await page.goto(rowUrl);
    await expect(page.getByLabel("Progress %")).toHaveValue("60");
    await expect(page.getByLabel(/^Status/)).toHaveValue("Internal QA/QC");
    await expect(page.getByLabel("Remarks")).toHaveValue(remark);
  });

  test("a region-scoped GIS Lead sees only the projects of their hub", async ({ page }) => {
    test.setTimeout(180_000);

    // The global lead sees every project; note the id of one outside the India hub.
    await signIn(page, ACCOUNTS.lead);
    const total = await kpi(page, "Total projects");
    await page.goto("/projects");
    await expect(page.getByRole("cell", { name: "QIC D9", exact: true })).toBeVisible();
    const outsideHref = await page.getByRole("link", { name: "QIC D9", exact: true }).getAttribute("href");
    expect(outsideHref).toBeTruthy();

    await signIn(page, ACCOUNTS.indiaLead);
    // India works on Laheq Island and QIC Delta B (D10) in the sample; QIC D9 is South Africa.
    await page.goto("/projects");
    await expect(page.getByRole("cell", { name: "QIC Delta B (D10)" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "QIC D9", exact: true })).toHaveCount(0);

    // The dashboard counts only the projects in scope.
    await page.goto("/");
    expect(await kpi(page, "Total projects")).toBeLessThan(total);

    // A project outside the scope is refused, not merely left out of the list: the page either
    // answers 404 or renders the access-denied panel.
    const res = await page.request.get(outsideHref!, { maxRedirects: 0 });
    if (res.status() === 200) {
      await page.goto(outsideHref!);
      await expect(page.getByText(DENIED)).toBeVisible();
    } else {
      expect([403, 404]).toContain(res.status());
    }
  });

  test("the global GIS Lead sees every project", async ({ page }) => {
    test.setTimeout(120_000);
    await signIn(page, ACCOUNTS.lead);
    await page.goto("/projects");
    await expect(page.getByRole("cell", { name: "QIC D9", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "QIC Delta B (D10)" })).toBeVisible();
  });
});
