import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runChecksInput, runWorkspaceChecks } from "../schemas/checks";
import { toolHandler } from "../result";
import { readOnly, type ToolContext } from "./types";

export const RUN_CHECKS_TOOL = "engineering_run_checks";

export const runChecksHandler = (context: ToolContext) =>
  toolHandler(() => runWorkspaceChecks(context.rootDir));

export const registerRunChecks = (
  server: McpServer,
  context: ToolContext,
): void => {
  server.registerTool(
    RUN_CHECKS_TOOL,
    {
      title: "Run the engineering checks",
      description:
        "Run the workspace validations — decision documents, owners, rollback, test strategy, observability — and return the same report as `eng check --json`. Run this after writing an artifact to see what is still missing.",
      inputSchema: runChecksInput,
      annotations: readOnly("Run the engineering checks"),
    },
    runChecksHandler(context),
  );
};
