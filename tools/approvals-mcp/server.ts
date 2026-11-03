// tools/approvals-mcp/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from
  "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const api = process.env.ACME_API_URL ?? "http://127.0.0.1:5000/api";
const server = new McpServer({ name: "acme-approvals", version: "1.0.0" });

server.registerTool("approvals_list_pending", {
  description: "List expenses waiting for the signed-in manager's " +
    "approval. Read-only. It cannot approve or reject anything.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(10),
    cursor: z.string().optional(),
    view: z.enum(["summary", "full"]).default("summary"),
  },
  annotations: { readOnlyHint: true },
}, async ({ limit, cursor, view }) => {
  if (!process.env.ACME_TOKEN) {
    const text = JSON.stringify({ error: { code: "not_signed_in",
      message: "No manager token.",
      hint: "Set ACME_TOKEN to your Acme ID token." } });
    return { content: [{ type: "text", text }], isError: true };
  }
  const q = new URLSearchParams({ limit: String(limit), view });
  if (cursor) q.set("cursor", cursor);
  const res = await fetch(`${api}/v1/approvals/pending?${q}`, {
    headers: { Authorization: `Bearer ${process.env.ACME_TOKEN}` },
  });
  // Pass the API's body through: the page, or ApiError with its hint.
  const text = await res.text();
  return { content: [{ type: "text", text }], isError: !res.ok };
});

await server.connect(new StdioServerTransport());
