export type ArtifactType =
  | "vision"
  | "roadmap"
  | "research"
  | "brief"
  | "decision"
  | "plan"
  | "review"
  | "risk"
  | "runbook";

export type ArtifactStatus =
  | "draft"
  | "proposed"
  | "accepted"
  | "deprecated"
  | "superseded";

export type CheckStatus = "passed" | "warning" | "failed";

export type CheckRequirement = "required" | "optional" | "disabled";

export interface EngineeringArtifact {
  id: string;
  type: ArtifactType;
  title: string;
  status: ArtifactStatus;
  owners: string[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
  relatedArtifacts: string[];
}

export interface CheckResult {
  status: CheckStatus;
  message: string;
  suggestion?: string;
}

export interface CheckContext {
  rootDir: string;
  config: EngineeringConfig;
  artifacts: EngineeringArtifactFile[];
}

export interface EngineeringArtifactFile {
  path: string;
  meta: EngineeringArtifact;
  body: string;
}

export interface EngineeringDocumentsConfig {
  visions: string;
  roadmaps: string;
  research: string;
  briefs: string;
  decisions: string;
  plans: string;
  reviews: string;
  risks: string;
  runbooks: string;
}

export interface EngineeringChecksConfig {
  rollback: CheckRequirement;
  owner: CheckRequirement;
  observability: CheckRequirement;
  testing: CheckRequirement;
  decisionDocument: CheckRequirement;
}

export type InteractiveCommand =
  | "create"
  | "decide"
  | "plan"
  | "review"
  | "attach";

export const INTERACTIVE_COMMANDS: InteractiveCommand[] = [
  "create",
  "decide",
  "plan",
  "review",
  "attach",
];

export type EngineeringInteractiveConfig = Record<InteractiveCommand, boolean>;

export interface EngineeringConfig {
  version: number;
  workspace: {
    name: string;
    attachedRepository?: string;
  };
  project: {
    name: string;
  };
  documents: EngineeringDocumentsConfig;
  checks: EngineeringChecksConfig;
  interactive: EngineeringInteractiveConfig;
}

export interface EngineeringCheck {
  id: string;
  name: string;
  description: string;
  run: (context: CheckContext) => Promise<CheckResult>;
}

export const ARTIFACT_TYPE_TO_DOCUMENT_KEY: Record<
  ArtifactType,
  keyof EngineeringDocumentsConfig
> = {
  vision: "visions",
  roadmap: "roadmaps",
  research: "research",
  brief: "briefs",
  decision: "decisions",
  plan: "plans",
  review: "reviews",
  risk: "risks",
  runbook: "runbooks",
};

export const nowIso = (): string => new Date().toISOString();

export const slugify = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "untitled";

export const padSequence = (sequence: number): string =>
  String(sequence).padStart(4, "0");

export const createArtifactId = (
  type: ArtifactType,
  sequence: number,
  title: string,
): string => `${type}-${padSequence(sequence)}-${slugify(title)}`;
