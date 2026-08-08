import { input, confirm } from "@inquirer/prompts";
import { createDecisionArtifact } from "@engineering-toolkit/artifacts";
import { loadConfig } from "@engineering-toolkit/config";
import type { ArtifactStatus } from "@engineering-toolkit/core";
import { parseStatus, requireFields, splitList } from "../utils/flags";
import { warnDroppedFields } from "../utils/warnings";

export interface DecideInput {
  title: string;
  problem: string;
  alternatives: string;
  decision: string;
  rollback: string;
  drivers?: string;
  consequences?: string;
  risks?: string;
  context?: string;
  owner?: string;
  tags?: string[];
  related?: string[];
  status?: ArtifactStatus;
}

export interface DecideOptions {
  rootDir: string;
  defaults?: Partial<DecideInput>;
}

export const decideFromInput = (
  rootDir: string,
  inputData: DecideInput,
): string => {
  requireFields(
    {
      title: inputData.title,
      problem: inputData.problem,
      alternatives: inputData.alternatives,
      decision: inputData.decision,
      rollback: inputData.rollback,
    },
    ["title", "problem", "alternatives", "decision", "rollback"],
  );

  const config = loadConfig(rootDir);
  const owner = inputData.owner?.trim() ?? "";

  const result = createDecisionArtifact({
    rootDir,
    config,
    title: inputData.title,
    problem: inputData.problem,
    alternatives: inputData.alternatives,
    decision: inputData.decision,
    rollback: inputData.rollback,
    context: inputData.context,
    drivers: inputData.drivers,
    consequences: inputData.consequences,
    risks: inputData.risks,
    owners: owner ? [owner] : [],
    tags: inputData.tags ?? [],
    relatedArtifacts: inputData.related ?? [],
    status: inputData.status ?? "accepted",
  });

  return warnDroppedFields(rootDir, result).relativePath;
};

export const decideCommand = async (
  options: DecideOptions,
): Promise<string> => {
  const defaults = options.defaults ?? {};

  const title = await input({
    message: "Decision title",
    default: defaults.title ?? "",
    validate: (value) => (value.trim() ? true : "Please provide a title"),
  });

  const problem = await input({
    message: "What problem are you solving?",
    default: defaults.problem ?? "",
    validate: (value) => (value.trim() ? true : "Please describe the problem"),
  });

  const alternatives = await input({
    message: "What alternatives did you consider?",
    default: defaults.alternatives ?? "",
    validate: (value) =>
      value.trim() ? true : "Please list the alternatives",
  });

  const drivers = await input({
    message: "What are the decision drivers / trade-offs?",
    default: defaults.drivers ?? "",
  });

  const decision = await input({
    message: "What is the decision?",
    default: defaults.decision ?? "",
    validate: (value) => (value.trim() ? true : "Please describe the decision"),
  });

  const consequences = await input({
    message: "What is the impact / consequences?",
    default: defaults.consequences ?? "",
  });

  const risks = await input({
    message: "What are the risks?",
    default: defaults.risks ?? "",
  });

  const rollback = await input({
    message: "Is there a rollback plan? Describe it",
    default: defaults.rollback ?? "",
    validate: (value) =>
      value.trim() ? true : "Please describe the rollback plan",
  });

  const owner = await input({
    message: "Owner (optional)",
    default: defaults.owner ?? "",
  });

  const context = await input({
    message: "Short context (optional)",
    default: defaults.context ?? "",
  });

  const accepted = await confirm({
    message: "Mark as accepted?",
    default: defaults.status ? defaults.status === "accepted" : true,
  });

  return decideFromInput(options.rootDir, {
    title,
    problem,
    alternatives,
    decision,
    rollback,
    drivers,
    consequences,
    risks,
    context,
    owner,
    tags: defaults.tags ?? [],
    related: defaults.related ?? [],
    status: accepted ? "accepted" : "proposed",
  });
};

export const decideDefaultsFromFlags = (flags: {
  title?: string;
  problem?: string;
  alternatives?: string;
  decision?: string;
  rollback?: string;
  drivers?: string;
  consequences?: string;
  risks?: string;
  context?: string;
  owner?: string;
  tag?: string | string[];
  related?: string | string[];
}): Partial<DecideInput> => ({
  title: flags.title,
  problem: flags.problem,
  alternatives: flags.alternatives,
  decision: flags.decision,
  rollback: flags.rollback,
  drivers: flags.drivers,
  consequences: flags.consequences,
  risks: flags.risks,
  context: flags.context,
  owner: flags.owner,
  tags: splitList(flags.tag),
  related: splitList(flags.related),
});

export const decideFromFlags = (
  rootDir: string,
  flags: {
    title?: string;
    problem?: string;
    alternatives?: string;
    decision?: string;
    rollback?: string;
    drivers?: string;
    consequences?: string;
    risks?: string;
    context?: string;
    owner?: string;
    tag?: string | string[];
    related?: string | string[];
    status?: string;
  },
): string =>
  decideFromInput(rootDir, {
    title: flags.title ?? "",
    problem: flags.problem ?? "",
    alternatives: flags.alternatives ?? "",
    decision: flags.decision ?? "",
    rollback: flags.rollback ?? "",
    drivers: flags.drivers,
    consequences: flags.consequences,
    risks: flags.risks,
    context: flags.context,
    owner: flags.owner,
    tags: splitList(flags.tag),
    related: splitList(flags.related),
    status: parseStatus(
      flags.status,
      ["draft", "proposed", "accepted", "deprecated", "superseded"],
      "accepted",
    ),
  });
