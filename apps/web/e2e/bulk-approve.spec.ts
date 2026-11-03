// A manager selects three, approves, and sees the summary.
import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("manager bulk-approves three expenses", async ({ page }) => {
  await signIn(page, "max@acme.test");
  await page.goto("/approvals");
  const samRows = page.getByRole("row", { name: /Sam/ });
  await expect(samRows).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    await samRows.nth(i).getByRole("checkbox").check();
  }
  await expect(page.getByText("3 selected")).toBeVisible();
  await page.getByRole("button", { name: "Approve selected" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("status")).toContainText("3 approved, 0 skipped");
  await expect(samRows).toHaveCount(0);
});
