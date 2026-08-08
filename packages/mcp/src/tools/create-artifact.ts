import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createArtifact } from "@engineering-toolkit/artifacts";
import { loadConfig } from "@engineering-toolkit/config";
import type { ArtifactStatus, ArtifactType } from "@engineering-toolkit/core";
import type { TemplateName } from "@engineering-toolkit/templates";
import { createArtifactInput, toWorkspacePath } from "../schemas/artifacts";
import { toolHandler } from "../result";
import { additive, type ToolContext } from "./types";

export const CREATE_ARTIFACT_TOOL = "engineering_create_artifact";

export interface CreateArtifactArgs {
  type: ArtifactType;
  title: string;
  data?: Record<string, string>;
  owners?: string[];
  tags?: string[];
  relatedArtifacts?: string[];
  status?: ArtifactStatus;
}

export const createArtifactHandler = (context: ToolContext) =>
  toolHandler((args: CreateArtifactArgs) => {
    const config = loadConfig(context.rootDir);

    const result = createArtifact({
      rootDir: context.rootDir,
      config,
      type: args.type,
      title: args.title,
      owners: args.owners ?? [],
      tags: args.tags ?? [],
      relatedArtifacts: args.relatedArtifacts ?? [],
      status: args.status ?? "draft",
      templateName: args.type as TemplateName,
      templateData: args.data ?? {},
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

export const registerCreateArtifact = (
  server: McpServer,
  context: ToolContext,
): void => {
  server.registerTool(
    CREATE_ARTIFACT_TOOL,
    {
      title: "Create an engineering artifact",
      description:
        "Write a new artifact of any type into the workspace, filling the template placeholders from `data`. Only call this when the user has asked for the artifact to be recorded — this writes a file that will be committed with the project.",
      inputSchema: createArtifactInput,
      annotations: additive("Create an engineering artifact"),
    },
    createArtifactHandler(context),
  );
};
