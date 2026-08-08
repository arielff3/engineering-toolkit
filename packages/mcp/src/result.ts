import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Every tool answers with one JSON text block. AI clients parse it, and a
 * human reading the transcript can still see exactly what the workspace said.
 */
export const jsonResult = (payload: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
});

export const errorResult = (message: string): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify({ error: message }, null, 2) }],
  isError: true,
});

/**
 * Turns a plain handler into an MCP handler.
 *
 * A workspace problem — not initialized, unreadable config, unknown id — is a
 * result the model should read and act on, not a protocol-level crash. So
 * failures come back as `isError` content instead of a thrown exception.
 */
export const toolHandler =
  <Args>(run: (args: Args) => Promise<unknown> | unknown) =>
  async (args: Args): Promise<CallToolResult> => {
    try {
      return jsonResult(await run(args));
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : String(error));
    }
  };
