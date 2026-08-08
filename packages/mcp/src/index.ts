import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createEngineeringMcpServer } from "./server";

export {
  createEngineeringMcpServer,
  SERVER_NAME,
  SERVER_VERSION,
  TOOL_NAMES,
  type EngineeringMcpServerOptions,
} from "./server";

export type { ToolContext } from "./tools/types";
export { LIST_ARTIFACTS_TOOL } from "./tools/list-artifacts";
export { GET_ARTIFACT_TOOL } from "./tools/get-artifact";
export { CREATE_ARTIFACT_TOOL } from "./tools/create-artifact";
export { CREATE_DECISION_TOOL } from "./tools/create-decision";
export { CREATE_PLAN_TOOL } from "./tools/create-plan";
export { RUN_CHECKS_TOOL } from "./tools/run-checks";
export { WORKSPACE_SUMMARY_TOOL } from "./tools/workspace-summary";

/**
 * Serves one workspace over stdio.
 *
 * stdout belongs to the JSON-RPC transport — anything this server wants to
 * say to a human goes to stderr.
 */
export const runStdioServer = async (rootDir: string): Promise<void> => {
  const server = createEngineeringMcpServer({ rootDir });
  await server.connect(new StdioServerTransport());
};
