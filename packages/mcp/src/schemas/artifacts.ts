import { relative, sep } from "node:path";
import { z } from "zod";
import { ARTIFACT_TYPES } from "@engineering-toolkit/core";
import type {
  ArtifactStatus,
  EngineeringArtifactFile,
} from "@engineering-toolkit/core";

export const artifactTypeSchema = z.enum(ARTIFACT_TYPES);

export const artifactStatusSchema = z.enum([
  "draft",
  "proposed",
  "accepted",
  "deprecated",
  "superseded",
]);

const ownersSchema = z.array(z.string().min(1));
const tagsSchema = z.array(z.string().min(1));
const relatedSchema = z.array(z.string().min(1));

export const listArtifactsInput = {
  type: artifactTypeSchema
    .optional()
    .describe("Restrict the listing to a single artifact type"),
};

export const getArtifactInput = {
  id: z
    .string()
    .min(1)
    .describe('Artifact id, for example "decision-0001-provider-architecture"'),
};

export const createArtifactInput = {
  type: artifactTypeSchema,
  title: z.string().min(1),
  data: z
    .record(z.string())
    .optional()
    .describe(
      "Template placeholder values keyed by placeholder name. Unfilled sections render as _TBD_",
    ),
  owners: ownersSchema.optional(),
  tags: tagsSchema.optional(),
  relatedArtifacts: relatedSchema.optional(),
  status: artifactStatusSchema.optional().describe("Defaults to draft"),
};

export const createDecisionInput = {
  title: z.string().min(1),
  problem: z.string().min(1).describe("The problem this decision solves"),
  alternatives: z.string().min(1).describe("Alternatives that were considered"),
  decision: z.string().min(1).describe("The decision that was made"),
  rollback: z.string().min(1).describe("How to undo this if it goes wrong"),
  drivers: z.string().optional().describe("Decision drivers and trade-offs"),
  consequences: z.string().optional(),
  risks: z.string().optional(),
  context: z
    .string()
    .optional()
    .describe("Short context. Falls back to the problem statement"),
  owner: z.string().optional(),
  tags: tagsSchema.optional(),
  relatedArtifacts: relatedSchema.optional(),
  status: artifactStatusSchema.optional().describe("Defaults to accepted"),
};

export const createPlanInput = {
  title: z.string().min(1),
  objective: z.string().min(1),
  testing: z.string().min(1).describe("Test strategy"),
  monitoring: z.string().min(1).describe("Observability and monitoring"),
  rollback: z.string().min(1),
  scope: z.string().optional(),
  outOfScope: z.string().optional(),
  dependencies: z.string().optional(),
  architecture: z.string().optional(),
  tasks: z.string().optional(),
  rollout: z.string().optional(),
  owner: z.string().optional(),
  tags: tagsSchema.optional(),
  relatedArtifacts: relatedSchema.optional(),
  status: artifactStatusSchema.optional().describe("Defaults to draft"),
};

export interface ArtifactSummary {
  id: string;
  type: string;
  title: string;
  status: ArtifactStatus;
  owners: string[];
  path: string;
}

export interface ArtifactDetail extends ArtifactSummary {
  body: string;
}

/** Workspace-relative and always POSIX, so output is identical on Windows. */
export const toWorkspacePath = (rootDir: string, absolutePath: string): string =>
  relative(rootDir, absolutePath).split(sep).join("/");

export const toArtifactSummary = (
  rootDir: string,
  file: EngineeringArtifactFile,
): ArtifactSummary => ({
  id: file.meta.id,
  type: file.meta.type,
  title: file.meta.title,
  status: file.meta.status,
  owners: file.meta.owners,
  path: toWorkspacePath(rootDir, file.path),
});

export const toArtifactDetail = (
  rootDir: string,
  file: EngineeringArtifactFile,
): ArtifactDetail => ({
  ...toArtifactSummary(rootDir, file),
  body: file.body,
});
