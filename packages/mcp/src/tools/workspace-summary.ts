import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listArtifacts } from "@engineering-toolkit/artifacts";
import { loadConfig } from "@engineering-toolkit/config";
import {
  ARTIFACT_TYPES,
  ARTIFACT_TYPE_TO_DOCUMENT_KEY,
} from "@engineering-toolkit/core";
import type {
  ArtifactStatus,
  ArtifactType,
  EngineeringArtifactFile,
  EngineeringDocumentsConfig,
} from "@engineering-toolkit/core";
import { runWorkspaceChecks } from "../schemas/checks";
import { toolHandler } from "../result";
import { readOnly, type ToolContext } from "./types";

export const WORKSPACE_SUMMARY_TOOL = "engineering_workspace_summary";

/** A retired artifact still lives in the repository but no longer applies. */
const RETIRED_STATUSES: ArtifactStatus[] = ["deprecated", "superseded"];

const isLive = (artifact: EngineeringArtifactFile): boolean =>
  !RETIRED_STATUSES.includes(artifact.meta.status);

interface ArtifactRef {
  id: string;
  title: string;
}

const toRefs = (artifacts: EngineeringArtifactFile[]): ArtifactRef[] =>
  artifacts.map((artifact) => ({
    id: artifact.meta.id,
    title: artifact.meta.title,
  }));

const ofType = (
  artifacts: EngineeringArtifactFile[],
  type: ArtifactType,
): EngineeringArtifactFile[] =>
  artifacts.filter((artifact) => artifact.meta.type === type);

export const workspaceSummaryHandler = (context: ToolContext) =>
  toolHandler(async () => {
    const config = loadConfig(context.rootDir);
    const artifacts = listArtifacts(context.rootDir, config);

    const counts = {} as Record<keyof EngineeringDocumentsConfig, number>;

    for (const type of ARTIFACT_TYPES) {
      counts[ARTIFACT_TYPE_TO_DOCUMENT_KEY[type]] = ofType(
        artifacts,
        type,
      ).length;
    }

    const checks = await runWorkspaceChecks(context.rootDir);

    return {
      workspace: {
        name: config.workspace?.name ?? config.project.name,
        ...(config.workspace?.attachedRepository
          ? { attachedRepository: config.workspace.attachedRepository }
          : {}),
      },
      counts,
      acceptedDecisions: toRefs(
        ofType(artifacts, "decision").filter(
          (artifact) => artifact.meta.status === "accepted",
        ),
      ),
      activePlans: toRefs(ofType(artifacts, "plan").filter(isLive)),
      openRisks: toRefs(ofType(artifacts, "risk").filter(isLive)),
      checks: { result: checks.result },
    };
  });

export const registerWorkspaceSummary = (
  server: McpServer,
  context: ToolContext,
): void => {
  server.registerTool(
    WORKSPACE_SUMMARY_TOOL,
    {
      title: "Summarize the engineering workspace",
      description:
        "The engineering memory of this project in one call: workspace name, how many artifacts of each type exist, the accepted decisions, the active plans, the open risks and whether the checks pass. Call this first, before proposing decisions, plans or code, so your answer starts from what the team already decided.",
      inputSchema: {},
      annotations: readOnly("Summarize the engineering workspace"),
    },
    workspaceSummaryHandler(context),
  );
};
