import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createPlanArtifact } from "@engineering-toolkit/artifacts";
import { loadConfig } from "@engineering-toolkit/config";
import type { ArtifactStatus } from "@engineering-toolkit/core";
import { createPlanInput, toWorkspacePath } from "../schemas/artifacts";
import { toolHandler } from "../result";
import { additive, type ToolContext } from "./types";

export const CREATE_PLAN_TOOL = "engineering_create_plan";

export interface CreatePlanArgs {
  title: string;
  objective: string;
  testing: string;
  monitoring: string;
  rollback: string;
  scope?: string;
  outOfScope?: string;
  dependencies?: string;
  architecture?: string;
  tasks?: string;
  rollout?: string;
  owner?: string;
  tags?: string[];
  relatedArtifacts?: string[];
  status?: ArtifactStatus;
}

export const createPlanHandler = (context: ToolContext) =>
  toolHandler((args: CreatePlanArgs) => {
    const config = loadConfig(context.rootDir);
    const owner = args.owner?.trim() ?? "";

    const result = createPlanArtifact({
      rootDir: context.rootDir,
      config,
      title: args.title,
      objective: args.objective,
      testing: args.testing,
      monitoring: args.monitoring,
      rollback: args.rollback,
      scope: args.scope,
      outOfScope: args.outOfScope,
      dependencies: args.dependencies,
      architecture: args.architecture,
      tasks: args.tasks,
      rollout: args.rollout,
      owners: owner ? [owner] : [],
      tags: args.tags ?? [],
      relatedArtifacts: args.relatedArtifacts ?? [],
      status: args.status ?? "draft",
    });

    return {
      id: result.meta.id,
      path: toWorkspacePath(context.rootDir, result.absolutePath),
      ...(result.droppedFields.length > 0
        ? {
            warning: `These fields were not written because the template has no placeholder for them: ${result.droppedFields.join(", ")}. Tell the user.`,
            droppedFields: result.droppedFields,
          }
        : {}),
    };
  });

export const registerCreatePlan = (
  server: McpServer,
  context: ToolContext,
): void => {
  server.registerTool(
    CREATE_PLAN_TOOL,
    {
      title: "Plan an implementation",
      description:
        "Record an implementation plan as a versioned artifact. Read the accepted decisions first — a plan that contradicts one is a bug. Requires objective, test strategy, monitoring and rollback; link the decision it implements with relatedArtifacts.",
      inputSchema: createPlanInput,
      annotations: additive("Plan an implementation"),
    },
    createPlanHandler(context),
  );
};
