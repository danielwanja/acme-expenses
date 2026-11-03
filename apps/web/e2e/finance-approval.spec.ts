// Over $2,500: the manager approves, then Finance approves.
import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("manager, then Finance", async ({ browser }) => {
  const ada = await browser.newPage();
  await signIn(ada, "ada@acme.test");
  await ada.goto("/expenses/new");
  await ada.getByLabel("Amount").fill("3000.00");
  await ada.getByLabel("Category").selectOption("Travel");
  await ada.getByLabel("Receipt").setInputFiles(
    { name: "flight.png", mimeType: "image/png", buffer: Buffer.from("receipt") });
  await ada.getByRole("button", { name: "Submit" }).click();
  await expect(ada.getByText("Submitted")).toBeVisible();

  const max = await browser.newPage();
  await signIn(max, "max@acme.test");
  await max.goto("/approvals");
  const row = max.getByRole("row", { name: /Ada.*\$3,000\.00/ });
  await expect(row.getByText("Finance approves after you")).toBeVisible();
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(row).toHaveCount(0);

  await ada.reload();
  await expect(ada.getByText("Awaiting Finance")).toBeVisible();

  const fran = await browser.newPage();
  await signIn(fran, "fran@acme.test");
  await fran.goto("/approvals");
  const financeRow = fran.getByRole("row", { name: /Ada.*\$3,000\.00/ });
  await financeRow.getByRole("button", { name: "Approve" }).click();
  await expect(financeRow).toHaveCount(0);

  await ada.reload();
  await expect(ada.getByText("Approved")).toBeVisible();
});
