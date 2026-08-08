import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createDecisionArtifact } from "@engineering-toolkit/artifacts";
import { loadConfig } from "@engineering-toolkit/config";
import type { ArtifactStatus } from "@engineering-toolkit/core";
import { createDecisionInput, toWorkspacePath } from "../schemas/artifacts";
import { toolHandler } from "../result";
import { additive, type ToolContext } from "./types";

export const CREATE_DECISION_TOOL = "engineering_create_decision";

export interface CreateDecisionArgs {
  title: string;
  problem: string;
  alternatives: string;
  decision: string;
  rollback: string;
  drivers?: string;
  consequences?: string;
  risks?: string;
  context?: string;
  owner?: string;
  tags?: string[];
  relatedArtifacts?: string[];
  status?: ArtifactStatus;
}

export const createDecisionHandler = (context: ToolContext) =>
  toolHandler((args: CreateDecisionArgs) => {
    const config = loadConfig(context.rootDir);
    const owner = args.owner?.trim() ?? "";

    const result = createDecisionArtifact({
      rootDir: context.rootDir,
      config,
      title: args.title,
      problem: args.problem,
      alternatives: args.alternatives,
      decision: args.decision,
      rollback: args.rollback,
      drivers: args.drivers,
      consequences: args.consequences,
      risks: args.risks,
      context: args.context,
      owners: owner ? [owner] : [],
      tags: args.tags ?? [],
      relatedArtifacts: args.relatedArtifacts ?? [],
      status: args.status ?? "accepted",
    });

    return {
      id: result.meta.id,
      path: toWorkspacePath(context.rootDir, result.absolutePath),
    };
  });

export const registerCreateDecision = (
  server: McpServer,
  context: ToolContext,
): void => {
  server.registerTool(
    CREATE_DECISION_TOOL,
    {
      title: "Record a technical decision",
      description:
        "Record a technical decision as a versioned artifact. The decision is the user's to make: only call this once they have chosen, and record what they actually decided. Requires the problem, the alternatives considered, the decision itself and a rollback path.",
      inputSchema: createDecisionInput,
      annotations: additive("Record a technical decision"),
    },
    createDecisionHandler(context),
  );
};
