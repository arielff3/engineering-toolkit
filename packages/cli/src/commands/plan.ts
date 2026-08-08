import { input, confirm } from "@inquirer/prompts";
import { createPlanArtifact } from "@engineering-toolkit/artifacts";
import { loadConfig } from "@engineering-toolkit/config";
import type { ArtifactStatus } from "@engineering-toolkit/core";
import { parseStatus, requireFields, splitList } from "../utils/flags";

export interface PlanInput {
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
  related?: string[];
  tags?: string[];
  status?: ArtifactStatus;
}

export interface PlanOptions {
  rootDir: string;
  defaults?: Partial<PlanInput>;
}

export const planFromInput = (
  rootDir: string,
  inputData: PlanInput,
): string => {
  requireFields(
    {
      title: inputData.title,
      objective: inputData.objective,
      testing: inputData.testing,
      monitoring: inputData.monitoring,
      rollback: inputData.rollback,
    },
    ["title", "objective", "testing", "monitoring", "rollback"],
  );

  const config = loadConfig(rootDir);
  const owner = inputData.owner?.trim() ?? "";

  const result = createPlanArtifact({
    rootDir,
    config,
    title: inputData.title,
    objective: inputData.objective,
    testing: inputData.testing,
    monitoring: inputData.monitoring,
    rollback: inputData.rollback,
    scope: inputData.scope,
    outOfScope: inputData.outOfScope,
    dependencies: inputData.dependencies,
    architecture: inputData.architecture,
    tasks: inputData.tasks,
    rollout: inputData.rollout,
    owners: owner ? [owner] : [],
    tags: inputData.tags ?? [],
    relatedArtifacts: inputData.related ?? [],
    status: inputData.status ?? "draft",
  });

  return result.relativePath;
};

export const planCommand = async (options: PlanOptions): Promise<string> => {
  const defaults = options.defaults ?? {};

  const title = await input({
    message: "Plan title",
    default: defaults.title ?? "",
    validate: (value) => (value.trim() ? true : "Please provide a title"),
  });

  const objective = await input({
    message: "Objective",
    default: defaults.objective ?? "",
    validate: (value) => (value.trim() ? true : "Please provide an objective"),
  });

  const scope = await input({
    message: "Scope",
    default: defaults.scope ?? "",
  });

  const outOfScope = await input({
    message: "Out of scope",
    default: defaults.outOfScope ?? "",
  });

  const dependencies = await input({
    message: "Dependencies",
    default: defaults.dependencies ?? "",
  });

  const architecture = await input({
    message: "Technical plan / architecture",
    default: defaults.architecture ?? "",
  });

  const tasks = await input({
    message: "Tasks",
    default: defaults.tasks ?? "",
  });

  const testing = await input({
    message: "Testing strategy",
    default: defaults.testing ?? "",
    validate: (value) =>
      value.trim() ? true : "Please describe the testing strategy",
  });

  const monitoring = await input({
    message: "Observability / monitoring",
    default: defaults.monitoring ?? "",
    validate: (value) =>
      value.trim() ? true : "Please describe observability/monitoring",
  });

  const rollout = await input({
    message: "Rollout",
    default: defaults.rollout ?? "",
  });

  const rollback = await input({
    message: "Rollback",
    default: defaults.rollback ?? "",
    validate: (value) =>
      value.trim() ? true : "Please describe the rollback plan",
  });

  const owner = await input({
    message: "Owner (optional)",
    default: defaults.owner ?? "",
  });

  const relatedDecision = await input({
    message: "Related decision (id, optional)",
    default: defaults.related?.[0] ?? "",
  });

  const accepted = await confirm({
    message: "Mark as accepted?",
    default: defaults.status === "accepted",
  });

  return planFromInput(options.rootDir, {
    title,
    objective,
    testing,
    monitoring,
    rollback,
    scope,
    outOfScope,
    dependencies,
    architecture,
    tasks,
    rollout,
    owner,
    tags: defaults.tags ?? [],
    related: relatedDecision.trim() ? [relatedDecision.trim()] : [],
    status: accepted ? "accepted" : "draft",
  });
};

export const planDefaultsFromFlags = (flags: {
  title?: string;
  objective?: string;
  testing?: string;
  monitoring?: string;
  rollback?: string;
  scope?: string;
  outOfScope?: string;
  dependencies?: string;
  architecture?: string;
  tasks?: string;
  rollout?: string;
  owner?: string;
  related?: string | string[];
  tag?: string | string[];
}): Partial<PlanInput> => ({
  title: flags.title,
  objective: flags.objective,
  testing: flags.testing,
  monitoring: flags.monitoring,
  rollback: flags.rollback,
  scope: flags.scope,
  outOfScope: flags.outOfScope,
  dependencies: flags.dependencies,
  architecture: flags.architecture,
  tasks: flags.tasks,
  rollout: flags.rollout,
  owner: flags.owner,
  related: splitList(flags.related),
  tags: splitList(flags.tag),
});

export const planFromFlags = (
  rootDir: string,
  flags: {
    title?: string;
    objective?: string;
    testing?: string;
    monitoring?: string;
    rollback?: string;
    scope?: string;
    outOfScope?: string;
    dependencies?: string;
    architecture?: string;
    tasks?: string;
    rollout?: string;
    owner?: string;
    related?: string | string[];
    tag?: string | string[];
    status?: string;
  },
): string =>
  planFromInput(rootDir, {
    title: flags.title ?? "",
    objective: flags.objective ?? "",
    testing: flags.testing ?? "",
    monitoring: flags.monitoring ?? "",
    rollback: flags.rollback ?? "",
    scope: flags.scope,
    outOfScope: flags.outOfScope,
    dependencies: flags.dependencies,
    architecture: flags.architecture,
    tasks: flags.tasks,
    rollout: flags.rollout,
    owner: flags.owner,
    related: splitList(flags.related),
    tags: splitList(flags.tag),
    status: parseStatus(
      flags.status,
      ["draft", "proposed", "accepted", "deprecated", "superseded"],
      "draft",
    ),
  });
