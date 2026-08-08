import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getArtifactById } from "@engineering-toolkit/artifacts";
import { loadConfig } from "@engineering-toolkit/config";
import { getArtifactInput, toArtifactDetail } from "../schemas/artifacts";
import { toolHandler } from "../result";
import { LIST_ARTIFACTS_TOOL } from "./list-artifacts";
import { readOnly, type ToolContext } from "./types";

export const GET_ARTIFACT_TOOL = "engineering_get_artifact";

export const getArtifactHandler = (context: ToolContext) =>
  toolHandler(({ id }: { id: string }) => {
    const config = loadConfig(context.rootDir);
    const artifact = getArtifactById(context.rootDir, config, id);

    if (!artifact) {
      throw new Error(
        `Artifact not found: ${id}. Call ${LIST_ARTIFACTS_TOOL} to see the ids this workspace has.`,
      );
    }

    return toArtifactDetail(context.rootDir, artifact);
  });

export const registerGetArtifact = (
  server: McpServer,
  context: ToolContext,
): void => {
  server.registerTool(
    GET_ARTIFACT_TOOL,
    {
      title: "Read an engineering artifact",
      description:
        "Read one artifact by id, including its full Markdown body. Use this to read the reasoning behind a decision, the steps of a plan, or the findings of a research artifact before recommending anything.",
      inputSchema: getArtifactInput,
      annotations: readOnly("Read an engineering artifact"),
    },
    getArtifactHandler(context),
  );
};
