import { expect, test } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
const password = process.env.E2E_ADMIN_PASSWORD ?? "ChangeMe-Local-Only-123!";

test.describe("GIS Hub smoke", () => {
  test("anonymous users are redirected to sign in", async ({ page }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login\?next=%2Fprojects/);
    await expect(page.getByRole("heading", { name: "GIS Hub" })).toBeVisible();
  });

  test("wrong password shows an error and no session", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Work e-mail").fill(email);
    await page.getByLabel("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Incorrect" })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("administrator signs in, registers a project, sees its update page and tracker, and signs out", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/login");
    await page.getByLabel("Work e-mail").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: /GIS PRACTICE HUB - DASHBOARD/ })).toBeVisible();

    const res = await page.request.get("/");
    expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");

    const name = `E2E Project ${Date.now().toString().slice(-6)}`;
    await page.goto("/projects/new");
    await page.getByLabel("Project Name").fill(name);
    await page.getByLabel("Client").fill("E2E Client");
    await page.getByLabel("Project Status").selectOption("Progressing");
    await page.getByRole("button", { name: "Add row" }).click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+\?created=1/);
    await expect(page.getByRole("heading", { name: new RegExp(`PROJECT UPDATE - ${name.toUpperCase()}`) })).toBeVisible();
    await expect(page.getByText("GIS delivery workflow")).toBeVisible();

    // A package for the project, then the Delivery Tracker shows it with the summary row.
    const url = page.url();
    const projectId = url.match(/\/projects\/([0-9a-f-]+)/)![1]!;
    await page.goto(`/packages/new?project=${projectId}`);
    await page.getByLabel("Design Stage").fill("DD - Detailed Design");
    await page.getByLabel(/^Discipline \*$/).fill("Roads & Highways");
    await page.getByLabel("Package / Description").fill("Road network");
    await page.getByLabel(/^Status \*$/).selectOption("In Progress");
    await page.getByLabel("Planned Submission").fill("2026-12-01");
    await page.getByLabel("Progress %").selectOption("40");
    await page.getByRole("button", { name: "Add row" }).click();
    await expect(page).toHaveURL(/\/packages\?saved=1/);
    await page.goto(`/delivery-tracker?project=${projectId}`);
    await expect(page.getByRole("cell", { name: "Roads & Highways (DD)" })).toBeVisible();
    await expect(page.getByText("Overall progress")).toBeVisible();

    await page.goto("/admin/audit?entityType=project&action=project.create");
    await expect(page.getByRole("cell", { name: "project.create" }).first()).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
