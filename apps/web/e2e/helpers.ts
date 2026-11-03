import { expect, type Page } from "@playwright/test";

/** Every seeded user has this password in the Auth emulator. */
export const PASSWORD = "acme-e2e-password";

/** Fills the app's sign-in form and waits until the app shows the user signed in. */
export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}
