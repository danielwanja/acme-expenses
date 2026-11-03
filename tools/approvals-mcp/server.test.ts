// Starts server.ts over stdio (Node runs the .ts file directly) against a
// fake Acme API, and talks to it with the MCP SDK's own client.
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterEach, expect, test } from "vitest";

const serverFile = fileURLToPath(new URL("./server.ts", import.meta.url));
const page = { items: [], nextCursor: null, totalPending: 0 };

let api: Server | undefined;
let client: Client | undefined;
afterEach(async () => {
  await client?.close();
  api?.close();
});

async function start(status: number, body: unknown, token: string | null = "max-token") {
  const seen: IncomingMessage[] = [];
  api = createServer((req, res) => {
    seen.push(req);
    res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
  });
  await new Promise<void>((r) => api?.listen(0, "127.0.0.1", r));
  const { port } = api.address() as AddressInfo;
  const env: Record<string, string> = { PATH: process.env.PATH ?? "",
    ACME_API_URL: `http://127.0.0.1:${port}/api` };
  if (token) env.ACME_TOKEN = token;
  client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [serverFile], env, stderr: "ignore" }));
  return { client, seen };
}

const textOf = (r: Awaited<ReturnType<Client["callTool"]>>) =>
  (r.content as Array<{ type: string; text: string }>)[0]?.text ?? "";

test("exposes one read-only tool with the contract's inputs", async () => {
  const { client } = await start(200, page);
  const { tools } = await client.listTools();
  expect(tools.map((t) => t.name)).toEqual(["approvals_list_pending"]);
  const tool = tools[0]!;
  expect(tool.annotations?.readOnlyHint).toBe(true);
  expect(tool.description).toContain("It cannot approve or reject anything.");
  expect(Object.keys(tool.inputSchema.properties ?? {}).sort())
    .toEqual(["cursor", "limit", "view"]);
});

test("forwards the manager's token and passes the page through", async () => {
  const { client, seen } = await start(200, page);
  const res = await client.callTool({ name: "approvals_list_pending", arguments: {} });
  expect(res.isError).toBe(false);
  expect(JSON.parse(textOf(res))).toEqual(page);
  expect(seen[0]?.url).toBe("/api/v1/approvals/pending?limit=10&view=summary");
  expect(seen[0]?.headers.authorization).toBe("Bearer max-token");
});

test("an API error comes back as a tool error with its hint", async () => {
  const body = { error: { code: "cursor_invalid", message: "stale",
    hint: "Call again without cursor", requestId: "r1" } };
  const { client } = await start(400, body);
  const res = await client.callTool({ name: "approvals_list_pending",
    arguments: { cursor: "old" } });
  expect(res.isError).toBe(true);
  expect(JSON.parse(textOf(res)).error.code).toBe("cursor_invalid");
});

test("no token: not_signed_in, and the API is never called", async () => {
  const { client, seen } = await start(200, page, null);
  const res = await client.callTool({ name: "approvals_list_pending", arguments: {} });
  expect(res.isError).toBe(true);
  expect(JSON.parse(textOf(res)).error.code).toBe("not_signed_in");
  expect(seen).toHaveLength(0);
});

test("the SDK rejects inputs outside the contract", async () => {
  const { client } = await start(200, page);
  const res = await client.callTool({ name: "approvals_list_pending",
    arguments: { limit: 500 } });
  expect(res.isError).toBe(true);
});
