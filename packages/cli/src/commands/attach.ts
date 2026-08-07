import { writeFileSync } from "node:fs";
import { input } from "@inquirer/prompts";
import {
  configToYaml,
  getConfigPath,
  loadConfig,
} from "@engineering-toolkit/config";
import { requireFields } from "../utils/flags";

export interface AttachOptions {
  rootDir: string;
  repository?: string;
}

export interface AttachCommandOptions {
  rootDir: string;
  defaults?: { repository?: string };
}

export const attachFromInput = (options: AttachOptions): string => {
  requireFields({ repo: options.repository }, ["repo"]);

  const repository = (options.repository ?? "").trim();
  const config = loadConfig(options.rootDir);

  writeFileSync(
    getConfigPath(options.rootDir),
    configToYaml({
      ...config,
      workspace: {
        ...config.workspace,
        name: config.workspace?.name ?? config.project.name,
        attachedRepository: repository,
      },
    }),
    "utf8",
  );

  return repository;
};

export const attachCommand = async (
  options: AttachCommandOptions,
): Promise<string> => {
  const current = loadConfig(options.rootDir).workspace?.attachedRepository;

  const repository = await input({
    message: "Repository URL or path",
    default: options.defaults?.repository ?? current ?? "",
    validate: (value) => (value.trim() ? true : "Please provide a repository"),
  });

  return attachFromInput({ rootDir: options.rootDir, repository });
};
