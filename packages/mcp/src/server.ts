import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  LIST_ARTIFACTS_TOOL,
  registerListArtifacts,
} from "./tools/list-artifacts";
import { GET_ARTIFACT_TOOL, registerGetArtifact } from "./tools/get-artifact";
import {
  CREATE_ARTIFACT_TOOL,
  registerCreateArtifact,
} from "./tools/create-artifact";
import {
  CREATE_DECISION_TOOL,
  registerCreateDecision,
} from "./tools/create-decision";
import { CREATE_PLAN_TOOL, registerCreatePlan } from "./tools/create-plan";
import { RUN_CHECKS_TOOL, registerRunChecks } from "./tools/run-checks";
import {
  WORKSPACE_SUMMARY_TOOL,
  registerWorkspaceSummary,
} from "./tools/workspace-summary";
import type { ToolContext } from "./tools/types";

export const SERVER_NAME = "engineering-toolkit";
export const SERVER_VERSION = "0.1.0";

/** Read tools first, write tools last — the order clients show them in. */
export const TOOL_NAMES = [
  WORKSPACE_SUMMARY_TOOL,
  LIST_ARTIFACTS_TOOL,
  GET_ARTIFACT_TOOL,
  RUN_CHECKS_TOOL,
  CREATE_ARTIFACT_TOOL,
  CREATE_DECISION_TOOL,
  CREATE_PLAN_TOOL,
] as const;

export interface EngineeringMcpServerOptions {
  /** Workspace directory holding `.engineering/config.yml`. */
  rootDir: string;
}

const INSTRUCTIONS = `This server exposes the engineering memory of a project: the decisions, plans, research, risks and runbooks the team has recorded, plus the checks that validate them.

Before proposing a decision, a plan, an architecture or code, call ${WORKSPACE_SUMMARY_TOOL} and read the accepted decisions. Use ${GET_ARTIFACT_TOOL} to read the reasoning behind anything relevant. Say which artifacts you used.

You do not make the decisions. Suggest, question, summarize and point out gaps, then let the user choose. Only call a create tool when the user has asked for the artifact to be recorded — it writes a file that gets committed with the project.`;

/**
 * An MCP server bound to one Engineering Toolkit workspace.
 *
 * Handlers stay thin on purpose: every rule about what an artifact contains
 * lives in the core packages, so the CLI and this server cannot drift.
 */
export const createEngineeringMcpServer = (
  options: EngineeringMcpServerOptions,
): McpServer => {
  const context: ToolContext = { rootDir: resolve(options.rootDir) };

  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: INSTRUCTIONS },
  );

  registerWorkspaceSummary(server, context);
  registerListArtifacts(server, context);
  registerGetArtifact(server, context);
  registerRunChecks(server, context);
  registerCreateArtifact(server, context);
  registerCreateDecision(server, context);
  registerCreatePlan(server, context);

  return server;
};
