import { input, confirm, select } from "@inquirer/prompts";
import { createArtifact } from "@engineering-toolkit/artifacts";
import { loadConfig } from "@engineering-toolkit/config";
import { requireFields, splitList } from "../utils/flags";

export interface ReviewInput {
  title: string;
  context: string;
  review: string;
  recommendation: string;
  decisionReference?: string;
  checklistDecision?: string;
  checklistTesting?: string;
  checklistRollback?: string;
  checklistMonitoring?: string;
  checklistSecurity?: string;
  checklistArchitecture?: string;
  risks?: string;
  missingItems?: string;
  owner?: string;
  tags?: string[];
}

export interface ReviewOptions {
  rootDir: string;
  defaults?: Partial<ReviewInput>;
}

const yesNo = async (
  message: string,
  initial?: string,
): Promise<string> => {
  const value = await confirm({
    message,
    default: normalizeYesNo(initial) === "yes",
  });
  return value ? "yes" : "no";
};

const normalizeYesNo = (value: string | undefined, fallback = "no"): string => {
  if (!value?.trim()) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (["yes", "y", "true", "1"].includes(normalized)) {
    return "yes";
  }

  if (["no", "n", "false", "0"].includes(normalized)) {
    return "no";
  }

  return value.trim();
};

export const reviewFromInput = (
  rootDir: string,
  inputData: ReviewInput,
): string => {
  requireFields(
    {
      title: inputData.title,
      context: inputData.context,
      review: inputData.review,
      recommendation: inputData.recommendation,
    },
    ["title", "context", "review", "recommendation"],
  );

  const config = loadConfig(rootDir);
  const decisionReference = (inputData.decisionReference ?? "").trim();
  const owner = inputData.owner?.trim() ?? "";

  const result = createArtifact({
    rootDir,
    config,
    type: "review",
    title: inputData.title.trim(),
    owners: owner ? [owner] : [],
    tags: inputData.tags ?? [],
    relatedArtifacts: decisionReference ? [decisionReference] : [],
    status: "proposed",
    templateName: "review",
    templateData: {
      context: inputData.context.trim(),
      decisionReference: decisionReference || "_TBD_",
      review: inputData.review.trim(),
      checklistDecision: normalizeYesNo(inputData.checklistDecision),
      checklistTesting: normalizeYesNo(inputData.checklistTesting),
      checklistRollback: normalizeYesNo(inputData.checklistRollback),
      checklistMonitoring: normalizeYesNo(inputData.checklistMonitoring),
      checklistSecurity: normalizeYesNo(inputData.checklistSecurity),
      checklistArchitecture: normalizeYesNo(inputData.checklistArchitecture),
      risks: (inputData.risks ?? "").trim(),
      missingItems: (inputData.missingItems ?? "").trim(),
      recommendation: inputData.recommendation.trim(),
    },
  });

  return result.relativePath;
};

export const reviewCommand = async (
  options: ReviewOptions,
): Promise<string> => {
  const defaults = options.defaults ?? {};

  const title = await input({
    message: "Review title",
    default: defaults.title ?? "",
    validate: (value) => (value.trim() ? true : "Please provide a title"),
  });

  const context = await input({
    message: "Context",
    default: defaults.context ?? "",
    validate: (value) => (value.trim() ? true : "Please provide context"),
  });

  const decisionReference = await input({
    message: "Decision reference (id or path)",
    default: defaults.decisionReference ?? "",
  });

  const review = await input({
    message: "Review / analysis",
    default: defaults.review ?? "",
    validate: (value) => (value.trim() ? true : "Please write the review"),
  });

  const checklistDecision = await yesNo(
    "Is a decision registered?",
    defaults.checklistDecision,
  );
  const checklistTesting = await yesNo(
    "Are tests defined?",
    defaults.checklistTesting,
  );
  const checklistRollback = await yesNo(
    "Is rollback defined?",
    defaults.checklistRollback,
  );
  const checklistMonitoring = await yesNo(
    "Is monitoring defined?",
    defaults.checklistMonitoring,
  );
  const checklistSecurity = await yesNo(
    "Was security considered?",
    defaults.checklistSecurity,
  );
  const checklistArchitecture = await yesNo(
    "Was architectural impact assessed?",
    defaults.checklistArchitecture,
  );

  const risks = await input({
    message: "Risks",
    default: defaults.risks ?? "",
  });

  const missingItems = await input({
    message: "Missing items",
    default: defaults.missingItems ?? "",
  });

  const recommendation = await select({
    message: "Recommendation",
    default: defaults.recommendation,
    choices: [
      { name: "Approve", value: "Approve" },
      { name: "Approve with changes", value: "Approve with changes" },
      { name: "Request changes", value: "Request changes" },
      { name: "Block", value: "Block" },
    ],
  });

  const owner = await input({
    message: "Owner (optional)",
    default: defaults.owner ?? "",
  });

  return reviewFromInput(options.rootDir, {
    tags: defaults.tags ?? [],
    title,
    context,
    review,
    recommendation,
    decisionReference,
    checklistDecision,
    checklistTesting,
    checklistRollback,
    checklistMonitoring,
    checklistSecurity,
    checklistArchitecture,
    risks,
    missingItems,
    owner,
  });
};

export const reviewFromFlags = (
  rootDir: string,
  flags: {
    title?: string;
    context?: string;
    review?: string;
    recommendation?: string;
    decisionReference?: string;
    checklistDecision?: string;
    checklistTesting?: string;
    checklistRollback?: string;
    checklistMonitoring?: string;
    checklistSecurity?: string;
    checklistArchitecture?: string;
    risks?: string;
    missingItems?: string;
    owner?: string;
    tag?: string | string[];
  },
): string =>
  reviewFromInput(rootDir, {
    title: flags.title ?? "",
    context: flags.context ?? "",
    review: flags.review ?? "",
    recommendation: flags.recommendation ?? "",
    decisionReference: flags.decisionReference,
    checklistDecision: flags.checklistDecision,
    checklistTesting: flags.checklistTesting,
    checklistRollback: flags.checklistRollback,
    checklistMonitoring: flags.checklistMonitoring,
    checklistSecurity: flags.checklistSecurity,
    checklistArchitecture: flags.checklistArchitecture,
    risks: flags.risks,
    missingItems: flags.missingItems,
    owner: flags.owner,
    tags: splitList(flags.tag),
  });

export const reviewDefaultsFromFlags = (flags: {
  title?: string;
  context?: string;
  review?: string;
  recommendation?: string;
  decisionReference?: string;
  checklistDecision?: string;
  checklistTesting?: string;
  checklistRollback?: string;
  checklistMonitoring?: string;
  checklistSecurity?: string;
  checklistArchitecture?: string;
  risks?: string;
  missingItems?: string;
  owner?: string;
  tag?: string | string[];
}): Partial<ReviewInput> => ({
  title: flags.title,
  context: flags.context,
  review: flags.review,
  recommendation: flags.recommendation,
  decisionReference: flags.decisionReference,
  checklistDecision: flags.checklistDecision,
  checklistTesting: flags.checklistTesting,
  checklistRollback: flags.checklistRollback,
  checklistMonitoring: flags.checklistMonitoring,
  checklistSecurity: flags.checklistSecurity,
  checklistArchitecture: flags.checklistArchitecture,
  risks: flags.risks,
  missingItems: flags.missingItems,
  owner: flags.owner,
  tags: splitList(flags.tag),
});
