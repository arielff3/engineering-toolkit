import { input } from "@inquirer/prompts";
import { createArtifact } from "@engineering-toolkit/artifacts";
import { loadConfig } from "@engineering-toolkit/config";
import type { ArtifactStatus } from "@engineering-toolkit/core";
import { parseStatus, requireFields, splitList } from "../utils/flags";

export interface ResearchInput {
  title: string;
  question: string;
  options: string;
  evidence: string;
  recommendation: string;
  context?: string;
  tradeoffs?: string;
  decisionToInform?: string;
  owner?: string;
  tags?: string[];
  related?: string[];
  status?: ArtifactStatus;
}

export interface ResearchOptions {
  rootDir: string;
  defaults?: Partial<ResearchInput>;
}

export const researchFromInput = (
  rootDir: string,
  inputData: ResearchInput,
): string => {
  requireFields(
    {
      title: inputData.title,
      question: inputData.question,
      options: inputData.options,
      evidence: inputData.evidence,
      recommendation: inputData.recommendation,
    },
    ["title", "question", "options", "evidence", "recommendation"],
  );

  const config = loadConfig(rootDir);
  const owner = inputData.owner?.trim() ?? "";

  const result = createArtifact({
    rootDir,
    config,
    type: "research",
    title: inputData.title.trim(),
    owners: owner ? [owner] : [],
    tags: inputData.tags ?? [],
    relatedArtifacts: inputData.related ?? [],
    status: inputData.status ?? "draft",
    templateName: "research",
    templateData: {
      question: inputData.question.trim(),
      context: (inputData.context ?? "").trim(),
      options: inputData.options.trim(),
      evidence: inputData.evidence.trim(),
      tradeoffs: (inputData.tradeoffs ?? "").trim(),
      recommendation: inputData.recommendation.trim(),
      decisionToInform: (inputData.decisionToInform ?? "").trim(),
    },
  });

  return result.relativePath;
};

export const researchCommand = async (
  options: ResearchOptions,
): Promise<string> => {
  const defaults = options.defaults ?? {};

  const title = await input({
    message: "Research title",
    default: defaults.title ?? "",
    validate: (value) => (value.trim() ? true : "Please provide a title"),
  });

  const question = await input({
    message: "What question are you trying to answer?",
    default: defaults.question ?? "",
    validate: (value) => (value.trim() ? true : "Please provide the question"),
  });

  const context = await input({
    message: "Why does this matter?",
    default: defaults.context ?? "",
  });

  const researchOptions = await input({
    message: "What options did you compare?",
    default: defaults.options ?? "",
    validate: (value) => (value.trim() ? true : "Please list the options"),
  });

  const evidence = await input({
    message: "What evidence did you find?",
    default: defaults.evidence ?? "",
    validate: (value) => (value.trim() ? true : "Please describe the evidence"),
  });

  const tradeoffs = await input({
    message: "What are the trade-offs?",
    default: defaults.tradeoffs ?? "",
  });

  const recommendation = await input({
    message: "What is your recommendation?",
    default: defaults.recommendation ?? "",
    validate: (value) =>
      value.trim() ? true : "Please provide a recommendation",
  });

  const decisionToInform = await input({
    message: "What decision should this research inform?",
    default: defaults.decisionToInform ?? "",
  });

  const owner = await input({
    message: "Owner (optional)",
    default: defaults.owner ?? "",
  });

  return researchFromInput(options.rootDir, {
    title,
    question,
    options: researchOptions,
    evidence,
    recommendation,
    context,
    tradeoffs,
    decisionToInform,
    owner,
    tags: defaults.tags ?? [],
    related: defaults.related ?? [],
    status: defaults.status ?? "draft",
  });
};

export const researchDefaultsFromFlags = (flags: {
  title?: string;
  question?: string;
  options?: string;
  evidence?: string;
  recommendation?: string;
  context?: string;
  tradeoffs?: string;
  decisionToInform?: string;
  owner?: string;
  tag?: string | string[];
  related?: string | string[];
  status?: string;
}): Partial<ResearchInput> => ({
  title: flags.title,
  question: flags.question,
  options: flags.options,
  evidence: flags.evidence,
  recommendation: flags.recommendation,
  context: flags.context,
  tradeoffs: flags.tradeoffs,
  decisionToInform: flags.decisionToInform,
  owner: flags.owner,
  tags: splitList(flags.tag),
  related: splitList(flags.related),
  status: parseStatus(
    flags.status,
    ["draft", "proposed", "accepted", "deprecated", "superseded"],
    "draft",
  ),
});

export const researchFromFlags = (
  rootDir: string,
  flags: {
    title?: string;
    question?: string;
    options?: string;
    evidence?: string;
    recommendation?: string;
    context?: string;
    tradeoffs?: string;
    decisionToInform?: string;
    owner?: string;
    tag?: string | string[];
    related?: string | string[];
    status?: string;
  },
): string =>
  researchFromInput(rootDir, {
    title: flags.title ?? "",
    question: flags.question ?? "",
    options: flags.options ?? "",
    evidence: flags.evidence ?? "",
    recommendation: flags.recommendation ?? "",
    context: flags.context,
    tradeoffs: flags.tradeoffs,
    decisionToInform: flags.decisionToInform,
    owner: flags.owner,
    tags: splitList(flags.tag),
    related: splitList(flags.related),
    status: parseStatus(
      flags.status,
      ["draft", "proposed", "accepted", "deprecated", "superseded"],
      "draft",
    ),
  });
