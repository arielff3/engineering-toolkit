import { input, confirm, select } from "@inquirer/prompts";
import { createArtifact } from "@engineering-toolkit/artifacts";
import { loadConfig } from "@engineering-toolkit/config";

export interface ReviewOptions {
  rootDir: string;
}

const yesNo = async (message: string): Promise<string> => {
  const value = await confirm({ message, default: false });
  return value ? "yes" : "no";
};

export const reviewCommand = async (
  options: ReviewOptions,
): Promise<string> => {
  const config = loadConfig(options.rootDir);

  const title = await input({
    message: "Review title",
    validate: (value) => (value.trim() ? true : "Please provide a title"),
  });

  const context = await input({
    message: "Context",
    validate: (value) => (value.trim() ? true : "Please provide context"),
  });

  const decisionReference = await input({
    message: "Decision reference (id or path)",
    default: "",
  });

  const review = await input({
    message: "Review / analysis",
    validate: (value) => (value.trim() ? true : "Please write the review"),
  });

  const checklistDecision = await yesNo("Is a decision registered?");
  const checklistTesting = await yesNo("Are tests defined?");
  const checklistRollback = await yesNo("Is rollback defined?");
  const checklistMonitoring = await yesNo("Is monitoring defined?");
  const checklistSecurity = await yesNo("Was security considered?");
  const checklistArchitecture = await yesNo(
    "Was architectural impact assessed?",
  );

  const risks = await input({
    message: "Risks",
    default: "",
  });

  const missingItems = await input({
    message: "Missing items",
    default: "",
  });

  const recommendation = await select({
    message: "Recommendation",
    choices: [
      { name: "Approve", value: "Approve" },
      { name: "Approve with changes", value: "Approve with changes" },
      { name: "Request changes", value: "Request changes" },
      { name: "Block", value: "Block" },
    ],
  });

  const owner = await input({
    message: "Owner (optional)",
    default: "",
  });

  const result = createArtifact({
    rootDir: options.rootDir,
    config,
    type: "review",
    title: title.trim(),
    owners: owner.trim() ? [owner.trim()] : [],
    relatedArtifacts: decisionReference.trim()
      ? [decisionReference.trim()]
      : [],
    status: "proposed",
    templateName: "review",
    templateData: {
      context: context.trim(),
      decisionReference: decisionReference.trim() || "_TBD_",
      review: review.trim(),
      checklistDecision,
      checklistTesting,
      checklistRollback,
      checklistMonitoring,
      checklistSecurity,
      checklistArchitecture,
      risks: risks.trim(),
      missingItems: missingItems.trim(),
      recommendation,
    },
  });

  return result.relativePath;
};
