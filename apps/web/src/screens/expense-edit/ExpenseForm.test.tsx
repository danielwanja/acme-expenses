import { fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { createDraft } from "../../expenses";
import { fakeFetch, renderWithClient } from "../../test/render";
import { ExpenseForm } from "./ExpenseForm";

vi.mock("../../firebase", async () => (await import("../../test/render")).fakeFirebase);
vi.mock("../../expenses", () => ({ createDraft: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());

const today = new Date().toISOString().slice(0, 10);
const eur = { currency: "EUR", base: "USD", date: today, rate: 1.0842 };
const fxDown = () => Response.json({
  error: { code: "fx_unavailable", message: "Exchange rate unavailable.", requestId: "r" },
}, { status: 503 });

const type = (amount: string) =>
  fireEvent.change(screen.getByLabelText("Amount"), { target: { value: amount } });
const pick = (currency: string) =>
  fireEvent.change(screen.getByLabelText("Currency"), { target: { value: currency } });

test("previews USD from the rate endpoint, converted in the browser", async () => {
  const stub = fakeFetch(() => Response.json(eur));
  vi.stubGlobal("fetch", stub.fetch);
  renderWithClient(<ExpenseForm uid="erin" />);
  type("42.50");
  pick("EUR");
  // 42.50 EUR x 1.0842 = 46.0785 USD -> $46.08 (half up, as at submit)
  expect(await screen.findByText(/≈ \$46\.08 USD at 1\.0842/)).toBeTruthy();
  const url = new URL(stub.requests[0]?.url ?? "");
  expect(url.pathname).toBe("/api/v1/fx/rate");
  expect(Object.fromEntries(url.searchParams)).toEqual({ currency: "EUR", date: today });
});

test("changing the amount converts again without refetching", async () => {
  const stub = fakeFetch(() => Response.json(eur));
  vi.stubGlobal("fetch", stub.fetch);
  renderWithClient(<ExpenseForm uid="erin" />);
  pick("EUR");
  type("42.50");
  expect(await screen.findByText(/≈ \$46\.08 USD/)).toBeTruthy();
  type("100");
  expect(await screen.findByText(/≈ \$108\.42 USD/)).toBeTruthy();
  type("1000.00");
  expect(await screen.findByText(/≈ \$1,084\.20 USD/)).toBeTruthy();
  expect(stub.requests).toHaveLength(1);
});

test.each([
  ["USD", "42.50"], ["EUR", "0"], ["EUR", "4x"], ["EUR", ""],
])("shows nothing for %s %j", async (currency, amount) => {
  vi.stubGlobal("fetch", fakeFetch(() => Response.json(eur)).fetch);
  renderWithClient(<ExpenseForm uid="erin" />);
  pick(currency);
  type(amount);
  await new Promise((r) => setTimeout(r, 20)); // let any fetch settle
  expect(screen.queryByText(/≈/)).toBeNull();
  expect(screen.queryByText(/today's rate/)).toBeNull();
});

test("says it's looking up the rate only while it is", async () => {
  let answer: (r: Response) => void = () => {};
  vi.stubGlobal("fetch", async () => new Promise<Response>((r) => { answer = r; }));
  renderWithClient(<ExpenseForm uid="erin" />);
  type("42.50");
  pick("EUR");
  expect(await screen.findByText("Looking up today's rate…")).toBeTruthy();
  answer(Response.json(eur));
  expect(await screen.findByText(/≈ \$46\.08 USD/)).toBeTruthy();
  expect(screen.queryByText("Looking up today's rate…")).toBeNull();
});

test("a failed rate says so without blocking the form", async () => {
  vi.stubGlobal("fetch", fakeFetch(fxDown).fetch);
  renderWithClient(<ExpenseForm uid="erin" />);
  type("42.50");
  pick("EUR");
  expect(await screen.findByText("Couldn't get today's rate to preview USD.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Submit" })).toHaveProperty("disabled", false);
});

test("fx_unavailable at submit keeps the draft and explains", async () => {
  vi.mocked(createDraft).mockResolvedValue("d1");
  vi.stubGlobal("fetch", fakeFetch((request) =>
    request.method === "GET" ? Response.json(eur) : fxDown()).fetch);
  renderWithClient(<ExpenseForm uid="erin" />);
  type("42.50");
  pick("EUR");
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  expect((await screen.findByRole("alert")).textContent)
    .toContain("We couldn't get today's exchange rate. Your draft is saved.");
});
