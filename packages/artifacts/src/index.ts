import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type {
  ArtifactStatus,
  ArtifactType,
  EngineeringArtifact,
  EngineeringArtifactFile,
  EngineeringConfig,
} from "@engineering-toolkit/core";
import {
  ARTIFACT_TYPES,
  ARTIFACT_TYPE_TO_DOCUMENT_KEY,
  createArtifactId,
  nowIso,
  padSequence,
  slugify,
} from "@engineering-toolkit/core";
import {
  findUnusedData,
  renderTemplateString,
  resolveTemplate,
  type TemplateData,
  type TemplateName,
} from "@engineering-toolkit/templates";

export interface CreateArtifactInput {
  rootDir: string;
  config: EngineeringConfig;
  type: ArtifactType;
  title: string;
  owners?: string[];
  tags?: string[];
  relatedArtifacts?: string[];
  status?: ArtifactStatus;
  body?: string;
  templateName?: TemplateName;
  templateData?: TemplateData;
}

export interface CreateArtifactResult {
  absolutePath: string;
  relativePath: string;
  meta: EngineeringArtifact;
  droppedFields: string[];
  customTemplatePath?: string;
}

const SEQUENCE_PATTERN = /^(\d{4})-/;

export const getDocumentDir = (
  rootDir: string,
  config: EngineeringConfig,
  type: ArtifactType,
): string => {
  const key = ARTIFACT_TYPE_TO_DOCUMENT_KEY[type];
  return join(rootDir, config.documents[key]);
};

export const nextSequence = (
  rootDir: string,
  config: EngineeringConfig,
  type: ArtifactType,
): number => {
  const dir = getDocumentDir(rootDir, config, type);

  if (!existsSync(dir)) {
    return 1;
  }

  const sequences = readdirSync(dir)
    .map((file) => SEQUENCE_PATTERN.exec(file)?.[1])
    .filter((value): value is string => Boolean(value))
    .map((value) => Number.parseInt(value, 10));

  if (sequences.length === 0) {
    return 1;
  }

  return Math.max(...sequences) + 1;
};

const serializeArtifact = (meta: EngineeringArtifact, body: string): string => {
  const frontmatter = stringifyYaml({
    id: meta.id,
    type: meta.type,
    title: meta.title,
    status: meta.status,
    owners: meta.owners,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    tags: meta.tags,
    relatedArtifacts: meta.relatedArtifacts,
  }).trimEnd();

  return `---\n${frontmatter}\n---\n\n${body.trim()}\n`;
};

export const parseArtifactFile = (
  absolutePath: string,
): EngineeringArtifactFile | null => {
  const raw = readFileSync(absolutePath, "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);

  if (!match) {
    return null;
  }

  const [, frontmatter, body] = match;
  const parsed = parseYaml(frontmatter ?? "") as Partial<EngineeringArtifact>;

  if (!parsed.id || !parsed.type || !parsed.title) {
    return null;
  }

  const meta: EngineeringArtifact = {
    id: parsed.id,
    type: parsed.type,
    title: parsed.title,
    status: parsed.status ?? "draft",
    owners: parsed.owners ?? [],
    createdAt: parsed.createdAt ?? nowIso(),
    updatedAt: parsed.updatedAt ?? nowIso(),
    tags: parsed.tags ?? [],
    relatedArtifacts: parsed.relatedArtifacts ?? [],
  };

  return {
    path: absolutePath,
    meta,
    body: (body ?? "").trim(),
  };
};

export const listArtifacts = (
  rootDir: string,
  config: EngineeringConfig,
  type?: ArtifactType,
): EngineeringArtifactFile[] => {
  const types: readonly ArtifactType[] = type ? [type] : ARTIFACT_TYPES;

  const artifacts: EngineeringArtifactFile[] = [];

  for (const artifactType of types) {
    const dir = getDocumentDir(rootDir, config, artifactType);

    if (!existsSync(dir)) {
      continue;
    }

    const files = readdirSync(dir)
      .filter((file) => file.endsWith(".md"))
      .sort();

    for (const file of files) {
      const absolutePath = join(dir, file);
      const artifact = parseArtifactFile(absolutePath);

      if (artifact) {
        artifacts.push(artifact);
      }
    }
  }

  return artifacts;
};

export const getArtifactById = (
  rootDir: string,
  config: EngineeringConfig,
  id: string,
): EngineeringArtifactFile | null => {
  const artifacts = listArtifacts(rootDir, config);
  return artifacts.find((artifact) => artifact.meta.id === id) ?? null;
};

export interface CreateDecisionArtifactInput {
  rootDir: string;
  config: EngineeringConfig;
  title: string;
  problem: string;
  alternatives: string;
  decision: string;
  rollback: string;
  context?: string;
  drivers?: string;
  consequences?: string;
  risks?: string;
  owners?: string[];
  tags?: string[];
  relatedArtifacts?: string[];
  status?: ArtifactStatus;
}

export interface CreatePlanArtifactInput {
  rootDir: string;
  config: EngineeringConfig;
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
  owners?: string[];
  tags?: string[];
  relatedArtifacts?: string[];
  status?: ArtifactStatus;
}

const trimmed = (value: string | undefined): string => (value ?? "").trim();

/**
 * A decision artifact with the decision template already filled in.
 *
 * The mapping from answers to template placeholders lives here, not in the
 * CLI, so every front end (CLI, MCP server) writes the same document.
 */
export const createDecisionArtifact = (
  input: CreateDecisionArtifactInput,
): CreateArtifactResult => {
  const problem = input.problem.trim();

  return createArtifact({
    rootDir: input.rootDir,
    config: input.config,
    type: "decision",
    title: input.title.trim(),
    owners: input.owners ?? [],
    tags: input.tags ?? [],
    relatedArtifacts: input.relatedArtifacts ?? [],
    status: input.status ?? "accepted",
    templateName: "decision",
    templateData: {
      context: trimmed(input.context) || problem,
      problem,
      drivers: trimmed(input.drivers),
      alternatives: input.alternatives.trim(),
      decision: input.decision.trim(),
      consequences: trimmed(input.consequences),
      risks: trimmed(input.risks),
      rollback: input.rollback.trim(),
    },
  });
};

/** A plan artifact with the plan template already filled in. */
export const createPlanArtifact = (
  input: CreatePlanArtifactInput,
): CreateArtifactResult =>
  createArtifact({
    rootDir: input.rootDir,
    config: input.config,
    type: "plan",
    title: input.title.trim(),
    owners: input.owners ?? [],
    tags: input.tags ?? [],
    relatedArtifacts: input.relatedArtifacts ?? [],
    status: input.status ?? "draft",
    templateName: "plan",
    templateData: {
      objective: input.objective.trim(),
      scope: trimmed(input.scope),
      outOfScope: trimmed(input.outOfScope),
      dependencies: trimmed(input.dependencies),
      architecture: trimmed(input.architecture),
      tasks: trimmed(input.tasks),
      testing: input.testing.trim(),
      monitoring: input.monitoring.trim(),
      rollout: trimmed(input.rollout),
      rollback: input.rollback.trim(),
    },
  });

export const createArtifact = (
  input: CreateArtifactInput,
): CreateArtifactResult => {
  const sequence = nextSequence(input.rootDir, input.config, input.type);
  const slug = slugify(input.title);
  const fileName = `${padSequence(sequence)}-${slug}.md`;
  const documentDir = getDocumentDir(input.rootDir, input.config, input.type);
  const absolutePath = join(documentDir, fileName);
  const timestamp = nowIso();

  const meta: EngineeringArtifact = {
    id: createArtifactId(input.type, sequence, input.title),
    type: input.type,
    title: input.title,
    status: input.status ?? "draft",
    owners: input.owners ?? [],
    createdAt: timestamp,
    updatedAt: timestamp,
    tags: input.tags ?? [],
    relatedArtifacts: input.relatedArtifacts ?? [],
  };

  const templateName = input.templateName ?? (input.type as TemplateName);
  const templateData = input.templateData ?? {};

  let body = input.body;
  let droppedFields: string[] = [];
  let customTemplatePath: string | undefined;

  if (body === undefined) {
    const template = resolveTemplate(templateName, { rootDir: input.rootDir });

    body = renderTemplateString(template.content, templateData);
    droppedFields = findUnusedData(template.content, templateData);
    customTemplatePath = template.customPath;
  }

  mkdirSync(documentDir, { recursive: true });
  writeFileSync(absolutePath, serializeArtifact(meta, body), "utf8");

  const relativePath = join(
    input.config.documents[ARTIFACT_TYPE_TO_DOCUMENT_KEY[input.type]],
    fileName,
  );

  return {
    absolutePath,
    relativePath,
    meta,
    droppedFields,
    ...(customTemplatePath ? { customTemplatePath } : {}),
  };
};
