import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import type { EngineeringConfig } from "@engineering-toolkit/core";

export const ENGINEERING_DIR = ".engineering";
export const CONFIG_FILE_NAME = "config.yml";

const checkRequirementSchema = z.enum(["required", "optional", "disabled"]);

export const engineeringConfigSchema = z.object({
  version: z.number().int().positive().default(1),
  project: z
    .object({
      name: z.string().min(1).default("untitled"),
    })
    .default({ name: "untitled" }),
  documents: z
    .object({
      decisions: z.string().default("docs/decisions"),
      plans: z.string().default("docs/plans"),
      reviews: z.string().default("docs/reviews"),
      risks: z.string().default("docs/risks"),
      runbooks: z.string().default("docs/runbooks"),
    })
    .default({
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
    .default({
      rollback: "required",
      owner: "required",
      observability: "required",
      testing: "required",
      decisionDocument: "required",
    }),
});

export type EngineeringConfigInput = z.input<typeof engineeringConfigSchema>;

export const getConfigPath = (rootDir: string): string =>
  join(rootDir, ENGINEERING_DIR, CONFIG_FILE_NAME);

export const getEngineeringDir = (rootDir: string): string =>
  join(rootDir, ENGINEERING_DIR);

export const createDefaultConfig = (projectName: string): EngineeringConfig =>
  engineeringConfigSchema.parse({
    version: 1,
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

export const configToYaml = (config: EngineeringConfig): string => {
  const lines = [
    "version: 1",
    "",
    "project:",
    `  name: ${config.project.name}`,
    "",
    "documents:",
    `  decisions: ${config.documents.decisions}`,
    `  plans: ${config.documents.plans}`,
    `  reviews: ${config.documents.reviews}`,
    `  risks: ${config.documents.risks}`,
    `  runbooks: ${config.documents.runbooks}`,
    "",
    "checks:",
    `  rollback: ${config.checks.rollback}`,
    `  owner: ${config.checks.owner}`,
    `  observability: ${config.checks.observability}`,
    `  testing: ${config.checks.testing}`,
    `  decisionDocument: ${config.checks.decisionDocument}`,
    "",
  ];

  return lines.join("\n");
};
