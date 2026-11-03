// apps/web/e2e/submit-and-approve.spec.ts
import { expect, test } from "@playwright/test";
import { signIn } from "./helpers"; // fills the app's sign-in form

test("employee submits, manager approves", async ({ browser }) => {
  const erin = await browser.newPage();
  await signIn(erin, "erin@acme.test");
  await erin.goto("/expenses/new");
  await erin.getByLabel("Amount").fill("120.00"); // over $75: manager
  await erin.getByLabel("Category").selectOption("Meals");
  await erin.getByLabel("Receipt").setInputFiles("e2e/fixtures/receipt.png");
  await erin.getByRole("button", { name: "Submit" }).click();
  await expect(erin.getByText("Submitted")).toBeVisible();

  const max = await browser.newPage();
  await signIn(max, "max@acme.test");
  await max.goto("/approvals");
  const row = max.getByRole("row", { name: /Erin.*\$120\.00/ });
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(row).toHaveCount(0); // leaves the pending list

  await erin.reload();
  await expect(erin.getByText("Approved")).toBeVisible();
});
