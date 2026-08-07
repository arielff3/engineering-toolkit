import { input, confirm } from "@inquirer/prompts";
import { createArtifact } from "@engineering-toolkit/artifacts";
import { loadConfig } from "@engineering-toolkit/config";

export interface DecideOptions {
  rootDir: string;
}

export const decideCommand = async (
  options: DecideOptions,
): Promise<string> => {
  const config = loadConfig(options.rootDir);

  const title = await input({
    message: "Decision title",
    validate: (value) => (value.trim() ? true : "Please provide a title"),
  });

  const problem = await input({
    message: "What problem are you solving?",
    validate: (value) => (value.trim() ? true : "Please describe the problem"),
  });

  const alternatives = await input({
    message: "What alternatives did you consider?",
    validate: (value) =>
      value.trim() ? true : "Please list the alternatives",
  });

  const drivers = await input({
    message: "What are the decision drivers / trade-offs?",
    default: "",
  });

  const decision = await input({
    message: "What is the decision?",
    validate: (value) => (value.trim() ? true : "Please describe the decision"),
  });

  const consequences = await input({
    message: "What is the impact / consequences?",
    default: "",
  });

  const risks = await input({
    message: "What are the risks?",
    default: "",
  });

  const rollback = await input({
    message: "Is there a rollback plan? Describe it",
    validate: (value) =>
      value.trim() ? true : "Please describe the rollback plan",
  });

  const owner = await input({
    message: "Owner (optional)",
    default: "",
  });

  const context = await input({
    message: "Short context (optional)",
    default: "",
  });

  const accepted = await confirm({
    message: "Mark as accepted?",
    default: true,
  });

  const result = createArtifact({
    rootDir: options.rootDir,
    config,
    type: "decision",
    title: title.trim(),
    owners: owner.trim() ? [owner.trim()] : [],
    status: accepted ? "accepted" : "proposed",
    templateName: "decision",
    templateData: {
      context: context.trim() || problem.trim(),
      problem: problem.trim(),
      drivers: drivers.trim(),
      alternatives: alternatives.trim(),
      decision: decision.trim(),
      consequences: consequences.trim(),
      risks: risks.trim(),
      rollback: rollback.trim(),
    },
  });

  return result.relativePath;
};
