import { Command } from "commander";
import { basename, resolve } from "node:path";
import { initProject } from "./commands/init";
import {
  decideCommand,
  decideDefaultsFromFlags,
  decideFromFlags,
} from "./commands/decide";
import {
  planCommand,
  planDefaultsFromFlags,
  planFromFlags,
} from "./commands/plan";
import {
  reviewCommand,
  reviewDefaultsFromFlags,
  reviewFromFlags,
} from "./commands/review";
import { checkCommand } from "./commands/check";
import { listCommand, parseArtifactType } from "./commands/list";
import { showCommand } from "./commands/show";
import { createCommand, createFromFlags } from "./commands/create";
import { attachCommand, attachFromInput } from "./commands/attach";
import { input } from "@inquirer/prompts";
import { loadConfig } from "@engineering-toolkit/config";
import {
  describeNonInteractiveReason,
  isNonInteractive,
  isTtySession,
  type InteractivityInput,
} from "./utils/flags";

const withInteractivityFlags = (command: Command): Command =>
  command
    .option(
      "-y, --yes",
      "Never prompt: read every value from flags and fail if one is missing",
      false,
    )
    .option("--non-interactive", "Alias for --yes", false)
    .option(
      "-i, --interactive",
      "Prompt even when disabled in .engineering/config.yml",
      false,
    );

const runFromFlags = <T>(mode: InteractivityInput, run: () => T): T => {
  try {
    return run();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Missing required options")
    ) {
      throw new Error(
        `${error.message}\nPrompting was skipped because ${describeNonInteractiveReason(mode)}.`,
      );
    }

    throw error;
  }
};

const resolveWorkspaceName = async (
  rootDir: string,
  options: { name?: string; yes?: boolean; nonInteractive?: boolean },
): Promise<string> => {
  const provided = options.name?.trim();

  if (provided) {
    return provided;
  }

  const fallback = basename(rootDir);

  if (options.yes || options.nonInteractive || !isTtySession()) {
    return fallback;
  }

  const answer = await input({
    message: "Workspace name",
    default: fallback,
  });

  return answer.trim() || fallback;
};

const main = async (): Promise<void> => {
  const program = new Command();

  program
    .name("eng")
    .description("Engineering Toolkit — engineering decisions as code")
    .version("0.1.0");

  type WorkspaceFlags = {
    name?: string;
    force?: boolean;
    yes?: boolean;
    nonInteractive?: boolean;
  };

  const createWorkspace = async (
    path: string,
    options: WorkspaceFlags,
    verb: "initialized" | "created",
  ): Promise<void> => {
    try {
      const rootDir = resolve(path);
      const workspaceName = await resolveWorkspaceName(rootDir, options);
      const created = initProject({
        rootDir,
        workspaceName,
        force: Boolean(options.force),
      });

      console.log(`Engineering workspace ${verb} in ${rootDir}`);
      console.log(`Workspace: ${workspaceName}`);
      console.log(`Files/folders: ${created.length}`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  };

  withInteractivityFlags(program.command("init"))
    .description("Initialize an Engineering Toolkit workspace")
    .option("-n, --name <name>", "Project name")
    .option("-f, --force", "Overwrite existing configuration", false)
    .action(async (options: WorkspaceFlags) => {
      await createWorkspace(process.cwd(), options, "initialized");
    });

  const registerWorkspaceCreate = (command: Command): Command =>
    withInteractivityFlags(command)
      .description("Create an engineering workspace")
      .argument("[path]", "Workspace directory", ".")
      .option("-n, --name <name>", "Workspace name")
      .option("-f, --force", "Overwrite existing configuration", false)
      .action(async (path: string, options: WorkspaceFlags) => {
        await createWorkspace(path, options, "created");
      });

  registerWorkspaceCreate(program.command("new"));

  registerWorkspaceCreate(
    program
      .command("workspace")
      .description("Manage engineering workspaces")
      .command("create"),
  );

  withInteractivityFlags(program.command("create"))
    .description("Create an engineering artifact")
    .argument("[type]", "Artifact type")
    .option("--title <title>", "Artifact title")
    .option("--data <key=value>", "Template placeholder value; repeat for each field. The value is taken verbatim, so commas are allowed", (value, previous: string[]) => {
      previous.push(value);
      return previous;
    }, [])
    .option("--owner <owner>", "Owner")
    .option("--tag <tag>", "Tag (repeatable)", (value, previous: string[]) => {
      previous.push(value);
      return previous;
    }, [])
    .option("--related <id>", "Related artifact id (repeatable)", (value, previous: string[]) => {
      previous.push(value);
      return previous;
    }, [])
    .option("--status <status>", "Status (default: draft)")
    .option("-C, --cwd <path>", "Workspace directory", process.cwd())
    .action(async (type: string | undefined, options) => {
      try {
        const rootDir = resolve(options.cwd);
        const config = loadConfig(rootDir);
        const flags = { ...options, type };

        const mode: InteractivityInput = {
          options: flags,
          config,
          command: "create",
          requiredFlags: ["type", "title"],
        };

        const path = isNonInteractive(mode)
          ? runFromFlags(mode, () => createFromFlags({ rootDir, ...flags }))
          : await createCommand({ rootDir, defaults: flags });

        console.log(`Artifact created: ${path}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });

  withInteractivityFlags(program.command("attach"))
    .description("Attach this engineering workspace to a repository")
    .option("--repo <repository>", "Repository URL or path")
    .option("-C, --cwd <path>", "Workspace directory", process.cwd())
    .action(async (options: { cwd: string; repo?: string }) => {
      try {
        const rootDir = resolve(options.cwd);
        const config = loadConfig(rootDir);

        const mode: InteractivityInput = {
          options,
          config,
          command: "attach",
          requiredFlags: ["repo"],
        };

        const repository = isNonInteractive(mode)
          ? runFromFlags(mode, () =>
              attachFromInput({ rootDir, repository: options.repo }),
            )
          : await attachCommand({
              rootDir,
              defaults: { repository: options.repo },
            });

        console.log(`Attached repository: ${repository}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });

  withInteractivityFlags(program.command("decide"))
    .description("Record a technical decision")
    .option("--title <title>", "Decision title")
    .option("--problem <text>", "Problem statement")
    .option("--alternatives <text>", "Alternatives considered")
    .option("--decision <text>", "Decision made")
    .option("--rollback <text>", "Rollback plan")
    .option("--drivers <text>", "Decision drivers / trade-offs")
    .option("--consequences <text>", "Impact / consequences")
    .option("--risks <text>", "Risks")
    .option("--context <text>", "Short context")
    .option("--owner <owner>", "Owner")
    .option("--tag <tag>", "Tag (repeatable or comma-separated)", (value, previous: string[]) => {
      previous.push(value);
      return previous;
    }, [])
    .option("--related <id>", "Related artifact id (repeatable)", (value, previous: string[]) => {
      previous.push(value);
      return previous;
    }, [])
    .option("--status <status>", "Status (default: accepted)")
    .option("-C, --cwd <path>", "Project directory", process.cwd())
    .action(async (options) => {
      try {
        const rootDir = resolve(options.cwd);
        const config = loadConfig(rootDir);

        const mode: InteractivityInput = {
          options,
          config,
          command: "decide",
          requiredFlags: [
            "title",
            "problem",
            "alternatives",
            "decision",
            "rollback",
          ],
        };

        const path = isNonInteractive(mode)
          ? runFromFlags(mode, () => decideFromFlags(rootDir, options))
          : await decideCommand({
              rootDir,
              defaults: decideDefaultsFromFlags(options),
            });

        console.log(`Decision created: ${path}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });

  withInteractivityFlags(program.command("plan"))
    .description("Plan an implementation")
    .option("--title <title>", "Plan title")
    .option("--objective <text>", "Objective")
    .option("--testing <text>", "Testing strategy")
    .option("--monitoring <text>", "Observability / monitoring")
    .option("--rollback <text>", "Rollback plan")
    .option("--scope <text>", "Scope")
    .option("--out-of-scope <text>", "Out of scope")
    .option("--dependencies <text>", "Dependencies")
    .option("--architecture <text>", "Technical plan / architecture")
    .option("--tasks <text>", "Tasks")
    .option("--rollout <text>", "Rollout plan")
    .option("--owner <owner>", "Owner")
    .option("--related <id>", "Related artifact id (repeatable)", (value, previous: string[]) => {
      previous.push(value);
      return previous;
    }, [])
    .option("--tag <tag>", "Tag (repeatable)", (value, previous: string[]) => {
      previous.push(value);
      return previous;
    }, [])
    .option("--status <status>", "Status (default: draft)")
    .option("-C, --cwd <path>", "Project directory", process.cwd())
    .action(async (options) => {
      try {
        const rootDir = resolve(options.cwd);
        const config = loadConfig(rootDir);

        const mode: InteractivityInput = {
          options,
          config,
          command: "plan",
          requiredFlags: [
            "title",
            "objective",
            "testing",
            "monitoring",
            "rollback",
          ],
        };

        const path = isNonInteractive(mode)
          ? runFromFlags(mode, () => planFromFlags(rootDir, options))
          : await planCommand({
              rootDir,
              defaults: planDefaultsFromFlags(options),
            });

        console.log(`Plan created: ${path}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });

  withInteractivityFlags(program.command("review"))
    .description("Run an engineering review")
    .option("--title <title>", "Review title")
    .option("--context <text>", "Context")
    .option("--review <text>", "Review / analysis")
    .option("--recommendation <text>", "Recommendation")
    .option("--decision-reference <id>", "Decision reference")
    .option("--checklist-decision <yes|no>", "Decision registered")
    .option("--checklist-testing <yes|no>", "Tests defined")
    .option("--checklist-rollback <yes|no>", "Rollback defined")
    .option("--checklist-monitoring <yes|no>", "Monitoring defined")
    .option("--checklist-security <yes|no>", "Security considered")
    .option("--checklist-architecture <yes|no>", "Architectural impact assessed")
    .option("--risks <text>", "Risks")
    .option("--missing-items <text>", "Missing items")
    .option("--owner <owner>", "Owner")
    .option("--tag <tag>", "Tag (repeatable)", (value, previous: string[]) => {
      previous.push(value);
      return previous;
    }, [])
    .option("-C, --cwd <path>", "Project directory", process.cwd())
    .action(async (options) => {
      try {
        const rootDir = resolve(options.cwd);
        const config = loadConfig(rootDir);

        const mode: InteractivityInput = {
          options,
          config,
          command: "review",
          requiredFlags: ["title", "context", "review", "recommendation"],
        };

        const path = isNonInteractive(mode)
          ? runFromFlags(mode, () => reviewFromFlags(rootDir, options))
          : await reviewCommand({
              rootDir,
              defaults: reviewDefaultsFromFlags(options),
            });

        console.log(`Review created: ${path}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });

  program
    .command("list")
    .description("List engineering artifacts")
    .option(
      "-t, --type <type>",
      "Artifact type: vision, roadmap, research, brief, decision, plan, review, risk, runbook",
    )
    .option("-C, --cwd <path>", "Project directory", process.cwd())
    .action(async (options: { cwd: string; type?: string }) => {
      try {
        const code = listCommand({
          rootDir: resolve(options.cwd),
          type: parseArtifactType(options.type),
        });
        process.exitCode = code;
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });

  program
    .command("show")
    .description("Show an engineering artifact by id")
    .argument("<artifact-id>", "Artifact id")
    .option("--json", "Output JSON", false)
    .option("-C, --cwd <path>", "Project directory", process.cwd())
    .action(async (artifactId: string, options: { cwd: string; json?: boolean }) => {
      try {
        const code = showCommand({
          rootDir: resolve(options.cwd),
          id: artifactId,
          json: Boolean(options.json),
        });
        process.exitCode = code;
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });

  program
    .command("check")
    .description("Run automated engineering validations")
    .option("--json", "Output JSON", false)
    .option("-C, --cwd <path>", "Project directory", process.cwd())
    .action(async (options: { cwd: string; json?: boolean }) => {
      try {
        const code = await checkCommand({
          rootDir: resolve(options.cwd),
          json: Boolean(options.json),
        });
        process.exitCode = code;
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });

  await program.parseAsync(process.argv);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
