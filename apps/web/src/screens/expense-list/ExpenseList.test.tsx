import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { listMyExpenses, type ExpenseRow } from "../../expenses";
import { renderWithClient } from "../../test/render";
import { ExpenseList } from "./ExpenseList";

vi.mock("../../firebase", async () => (await import("../../test/render")).fakeFirebase);
vi.mock("../../expenses", () => ({ listMyExpenses: vi.fn() }));

const lunch: ExpenseRow = {
  id: "e1", ownerId: "erin", amount: 4_250, currency: "USD", category: "Meals",
  spentOn: "2026-10-14", note: "", receiptPath: null, status: "submitted",
};

test("shows the signed-in employee's expenses", async () => {
  vi.mocked(listMyExpenses).mockResolvedValue([lunch]);
  renderWithClient(<ExpenseList uid="erin" />);
  expect(screen.getByText("Loading your expenses…")).toBeTruthy();
  expect(await screen.findByText("$42.50")).toBeTruthy();
  expect(listMyExpenses).toHaveBeenCalledWith("erin");
});

test("says so when there are none", async () => {
  vi.mocked(listMyExpenses).mockResolvedValue([]);
  renderWithClient(<ExpenseList uid="erin" />);
  expect(await screen.findByText(/No expenses yet/)).toBeTruthy();
});

test("shows the error state when Firestore fails", async () => {
  vi.mocked(listMyExpenses).mockRejectedValue(new Error("permission-denied"));
  renderWithClient(<ExpenseList uid="erin" />);
  expect((await screen.findByRole("alert")).textContent)
    .toBe("Couldn't load your expenses.");
});
