import { input, confirm } from "@inquirer/prompts";
import { createArtifact } from "@engineering-toolkit/artifacts";
import { loadConfig } from "@engineering-toolkit/config";

export interface PlanOptions {
  rootDir: string;
}

export const planCommand = async (options: PlanOptions): Promise<string> => {
  const config = loadConfig(options.rootDir);

  const title = await input({
    message: "Plan title",
    validate: (value) => (value.trim() ? true : "Please provide a title"),
  });

  const objective = await input({
    message: "Objective",
    validate: (value) => (value.trim() ? true : "Please provide an objective"),
  });

  const scope = await input({
    message: "Scope",
    default: "",
  });

  const outOfScope = await input({
    message: "Out of scope",
    default: "",
  });

  const dependencies = await input({
    message: "Dependencies",
    default: "",
  });

  const architecture = await input({
    message: "Technical plan / architecture",
    default: "",
  });

  const tasks = await input({
    message: "Tasks",
    default: "",
  });

  const testing = await input({
    message: "Testing strategy",
    validate: (value) =>
      value.trim() ? true : "Please describe the testing strategy",
  });

  const monitoring = await input({
    message: "Observability / monitoring",
    validate: (value) =>
      value.trim() ? true : "Please describe observability/monitoring",
  });

  const rollout = await input({
    message: "Rollout",
    default: "",
  });

  const rollback = await input({
    message: "Rollback",
    validate: (value) =>
      value.trim() ? true : "Please describe the rollback plan",
  });

  const owner = await input({
    message: "Owner (optional)",
    default: "",
  });

  const relatedDecision = await input({
    message: "Related decision (id, optional)",
    default: "",
  });

  const accepted = await confirm({
    message: "Mark as accepted?",
    default: false,
  });

  const result = createArtifact({
    rootDir: options.rootDir,
    config,
    type: "plan",
    title: title.trim(),
    owners: owner.trim() ? [owner.trim()] : [],
    relatedArtifacts: relatedDecision.trim() ? [relatedDecision.trim()] : [],
    status: accepted ? "accepted" : "draft",
    templateName: "plan",
    templateData: {
      objective: objective.trim(),
      scope: scope.trim(),
      outOfScope: outOfScope.trim(),
      dependencies: dependencies.trim(),
      architecture: architecture.trim(),
      tasks: tasks.trim(),
      testing: testing.trim(),
      monitoring: monitoring.trim(),
      rollout: rollout.trim(),
      rollback: rollback.trim(),
    },
  });

  return result.relativePath;
};
