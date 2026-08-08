import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { z } from "zod";
import type { EngineeringConfig } from "@engineering-toolkit/core";

export const ENGINEERING_DIR = ".engineering";
export const CONFIG_FILE_NAME = "config.yml";

const checkRequirementSchema = z.enum(["required", "optional", "disabled"]);

export const engineeringConfigSchema = z.object({
  version: z.number().int().positive().default(1),
  workspace: z
    .object({
      name: z.string().min(1).default("untitled"),
      attachedRepository: z.string().optional(),
    })
    .passthrough()
    .default({ name: "untitled" }),
  project: z
    .object({
      name: z.string().min(1).default("untitled"),
    })
    .passthrough()
    .default({ name: "untitled" }),
  documents: z
    .object({
      visions: z.string().default("docs/visions"),
      roadmaps: z.string().default("docs/roadmaps"),
      research: z.string().default("docs/research"),
      briefs: z.string().default("docs/briefs"),
      decisions: z.string().default("docs/decisions"),
      plans: z.string().default("docs/plans"),
      reviews: z.string().default("docs/reviews"),
      risks: z.string().default("docs/risks"),
      runbooks: z.string().default("docs/runbooks"),
    })
    .passthrough()
    .default({
      visions: "docs/visions",
      roadmaps: "docs/roadmaps",
      research: "docs/research",
      briefs: "docs/briefs",
      decisions: "docs/decisions",
      plans: "docs/plans",
      reviews: "docs/reviews",
      risks: "docs/risks",
      runbooks: "docs/runbooks",
    }),
  checks: z
    .object({
      rollback: checkRequirementSchema.default("required"),
      owner: checkRequirementSchema.default("required"),
      observability: checkRequirementSchema.default("required"),
      testing: checkRequirementSchema.default("required"),
      decisionDocument: checkRequirementSchema.default("required"),
    })
    .passthrough()
    .default({
      rollback: "required",
      owner: "required",
      observability: "required",
      testing: "required",
      decisionDocument: "required",
    }),
  interactive: z
    .object({
      create: z.boolean().default(true),
      research: z.boolean().default(true),
      decide: z.boolean().default(true),
      plan: z.boolean().default(true),
      review: z.boolean().default(true),
      attach: z.boolean().default(true),
    })
    .passthrough()
    .default({
      create: true,
      research: true,
      decide: true,
      plan: true,
      review: true,
      attach: true,
    }),
})
  .passthrough();

export type EngineeringConfigInput = z.input<typeof engineeringConfigSchema>;

export const getConfigPath = (rootDir: string): string =>
  join(rootDir, ENGINEERING_DIR, CONFIG_FILE_NAME);

export const getEngineeringDir = (rootDir: string): string =>
  join(rootDir, ENGINEERING_DIR);

export const createDefaultConfig = (projectName: string): EngineeringConfig =>
  engineeringConfigSchema.parse({
    version: 1,
    workspace: { name: projectName },
    project: { name: projectName },
  });

export const parseConfig = (raw: unknown): EngineeringConfig =>
  engineeringConfigSchema.parse(raw);

export const loadConfig = (rootDir: string): EngineeringConfig => {
  const configPath = getConfigPath(rootDir);

  if (!existsSync(configPath)) {
    throw new Error(
      `Engineering Toolkit is not initialized. Run "eng init" first.\nExpected file: ${configPath}`,
    );
  }

  const contents = readFileSync(configPath, "utf8");
  const parsed = parseYaml(contents);

  return parseConfig(parsed);
};

const KNOWN_ROOT_KEYS = new Set([
  "version",
  "workspace",
  "project",
  "documents",
  "checks",
  "interactive",
]);

const omitUndefined = (value: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  );

const addSectionSpacing = (yamlText: string): string => {
  const lines = yamlText.split("\n");
  const output: string[] = [];

  for (const line of lines) {
    const isTopLevelKey = /^[A-Za-z_][\w-]*:/.test(line);

    if (isTopLevelKey && output.length > 0 && output.at(-1) !== "") {
      output.push("");
    }

    output.push(line);
  }

  return output.join("\n");
};

export const configToYaml = (config: EngineeringConfig): string => {
  const source = config as unknown as Record<string, unknown>;

  const document: Record<string, unknown> = {
    version: config.version ?? 1,
    workspace: omitUndefined({
      ...(config.workspace ?? {}),
      name: config.workspace?.name ?? config.project.name,
    }),
    project: omitUndefined({ ...config.project }),
    documents: omitUndefined({ ...config.documents }),
    checks: omitUndefined({ ...config.checks }),
    interactive: omitUndefined({ ...config.interactive }),
  };

  for (const [key, value] of Object.entries(source)) {
    if (!KNOWN_ROOT_KEYS.has(key) && value !== undefined) {
      document[key] = value;
    }
  }

  return addSectionSpacing(stringifyYaml(document, { lineWidth: 0 }));
};
