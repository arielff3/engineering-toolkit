import { Command } from "commander";
import { basename, resolve } from "node:path";
import { initProject } from "./commands/init";
import { decideCommand } from "./commands/decide";
import { planCommand } from "./commands/plan";
import { reviewCommand } from "./commands/review";
import { checkCommand } from "./commands/check";
import { listCommand, parseArtifactType } from "./commands/list";

const main = async (): Promise<void> => {
  const program = new Command();

  program
    .name("eng")
    .description("Engineering Toolkit — engineering decisions as code")
    .version("0.1.0");

  program
    .command("init")
    .description("Initialize Engineering Toolkit in the current project")
    .option("-n, --name <name>", "Project name")
    .option("-f, --force", "Overwrite existing configuration", false)
    .action(async (options: { name?: string; force?: boolean }) => {
      const rootDir = process.cwd();
      const projectName = options.name?.trim() || basename(rootDir);

      try {
        const created = initProject({
          rootDir,
          projectName,
          force: Boolean(options.force),
        });

        console.log(`Engineering Toolkit initialized in ${rootDir}`);
        console.log(`Project: ${projectName}`);
        console.log(`Files/folders: ${created.length}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });

  program
    .command("decide")
    .description("Record a technical decision")
    .action(async () => {
      try {
        const path = await decideCommand({ rootDir: process.cwd() });
        console.log(`Decision created: ${path}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });

  program
    .command("plan")
    .description("Plan an implementation")
    .action(async () => {
      try {
        const path = await planCommand({ rootDir: process.cwd() });
        console.log(`Plan created: ${path}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });

  program
    .command("review")
    .description("Run an engineering review")
    .action(async () => {
      try {
        const path = await reviewCommand({ rootDir: process.cwd() });
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
      "Artifact type: decision, plan, review, risk, runbook",
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
    .command("check")
    .description("Run automated engineering validations")
    .option("-C, --cwd <path>", "Project directory", process.cwd())
    .action(async (options: { cwd: string }) => {
      try {
        const code = await checkCommand({ rootDir: resolve(options.cwd) });
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
