import { expect, test } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
const password = process.env.E2E_ADMIN_PASSWORD ?? "ChangeMe-Local-Only-123!";

test.describe("Phase 0 smoke", () => {
  test("anonymous users are redirected to sign in", async ({ page }) => {
    await page.goto("/employees");
    await expect(page).toHaveURL(/\/login\?next=%2Femployees/);
    await expect(page.getByRole("heading", { name: "Resource Planner" })).toBeVisible();
  });

  test("wrong password shows an error and no session", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Work e-mail").fill(email);
    await page.getByLabel("Password").fill("definitely-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Incorrect" })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("administrator signs in, creates a discipline, sees it audited and signs out", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Work e-mail").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();

    // Security headers are present on HTML responses.
    const res = await page.request.get("/");
    expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");

    const code = `E2E${Date.now().toString().slice(-6)}`;
    await page.getByRole("link", { name: "Disciplines", exact: true }).click();
    await page.getByRole("link", { name: "New discipline" }).first().click();
    await page.getByLabel("Code").fill(code);
    await page.getByLabel("Name").fill(`E2E discipline ${code}`);
    await page.getByRole("button", { name: "Create discipline" }).click();
    await expect(page).toHaveURL(/\/admin\/disciplines\?saved=1/);
    await expect(page.getByRole("cell", { name: code, exact: true })).toBeVisible();

    // Duplicate code is rejected with a readable message.
    await page.getByRole("link", { name: "New discipline" }).first().click();
    await page.getByLabel("Code").fill(code);
    await page.getByLabel("Name").fill("Duplicate");
    await page.getByRole("button", { name: "Create discipline" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "already in use" })).toBeVisible();

    await page.goto("/admin/audit?entityType=discipline&action=discipline.create");
    await expect(page.getByRole("cell", { name: "discipline.create" }).first()).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/admin/disciplines");
    await expect(page).toHaveURL(/\/login/);
  });
});
