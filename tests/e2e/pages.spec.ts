import { expect, test } from "@playwright/test";

/**
 * Every page of the navigation is opened once (proposal 15). CI runs this file twice: on a
 * database that holds only the administrator, and again after the sample workbook is loaded.
 * A page that only works with data, or only without, fails here before a merge. The two defects
 * that reached the live Hub on 2026-11-10 were of that kind.
 */
const email = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
const password = process.env.E2E_ADMIN_PASSWORD ?? "ChangeMe-Local-Only-123!";

test("the administrator opens every page of the navigation without an error", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`${page.url()}: ${err.message}`));

  await page.goto("/login");
  await page.getByLabel("Work e-mail").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /GIS PRACTICE HUB - DASHBOARD/ })).toBeVisible();

  const hrefs = await page.getByRole("navigation", { name: "Main" }).first().getByRole("link").evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
  const paths = [...new Set(hrefs.filter((h) => h.startsWith("/")))];
  // The whole menu, not a part of it: the administrator sees every group.
  expect(paths.length).toBeGreaterThanOrEqual(18);
  // Pages reached from a button, not from the menu.
  paths.push("/projects/new", "/packages/new", "/account/password");

  const open = async (path: string) => {
    const res = await page.goto(path);
    expect(res?.status(), path).toBeLessThan(400);
    await expect(page.locator("main h1, main h2").first(), path).toBeVisible();
    await expect(page.getByText("Something went wrong"), path).toHaveCount(0);
    await expect(page.getByText(/Access denied/), path).toHaveCount(0);
    await expect(page.getByText("Page not found"), path).toHaveCount(0);
  };
  for (const path of paths) await open(path);

  // With data: the first project report, its form, and the first row of a register and of a client schema.
  await page.goto("/projects");
  const report = page.getByRole("link", { name: "Open report" }).first();
  if (await report.count()) {
    const href = (await report.getAttribute("href"))!;
    await open(href);
    await open(`${href.split("?")[0]}/edit`);
    await page.goto("/packages");
    const edit = page.getByRole("link", { name: /^Edit / }).first();
    if (await edit.count()) await open((await edit.getAttribute("href"))!);
  }

  expect(errors).toEqual([]);
});
