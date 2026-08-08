import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listArtifacts } from "@engineering-toolkit/artifacts";
import { loadConfig } from "@engineering-toolkit/config";
import type { ArtifactType } from "@engineering-toolkit/core";
import { listArtifactsInput, toArtifactSummary } from "../schemas/artifacts";
import { toolHandler } from "../result";
import { readOnly, type ToolContext } from "./types";

export const LIST_ARTIFACTS_TOOL = "engineering_list_artifacts";

export const listArtifactsHandler = (context: ToolContext) =>
  toolHandler(({ type }: { type?: ArtifactType }) => {
    const config = loadConfig(context.rootDir);
    const artifacts = listArtifacts(context.rootDir, config, type);

    return {
      artifacts: artifacts.map((artifact) =>
        toArtifactSummary(context.rootDir, artifact),
      ),
    };
  });

export const registerListArtifacts = (
  server: McpServer,
  context: ToolContext,
): void => {
  server.registerTool(
    LIST_ARTIFACTS_TOOL,
    {
      title: "List engineering artifacts",
      description:
        "List the engineering artifacts recorded in this workspace: visions, roadmaps, research, briefs, decisions, plans, reviews, risks and runbooks. Returns metadata only — call get_artifact for the body. Start here to find out what has already been decided.",
      inputSchema: listArtifactsInput,
      annotations: readOnly("List engineering artifacts"),
    },
    listArtifactsHandler(context),
  );
};
