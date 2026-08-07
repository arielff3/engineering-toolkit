import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  configToYaml,
  createDefaultConfig,
  getConfigPath,
  getEngineeringDir,
} from "@engineering-toolkit/config";
import { getAllBuiltInTemplates } from "@engineering-toolkit/templates";

export interface InitOptions {
  rootDir: string;
  workspaceName: string;
  force?: boolean;
}

const STANDARDS = {
  "architecture.md": `# Architecture Standards

Define the architectural principles for this project.

## Principles

- Prefer simplicity over premature abstraction
- Keep public APIs stable
- Document breaking changes as decisions
`,
  "code-review.md": `# Code Review Standards

## Checklist

- Does the change match an accepted decision or plan?
- Are tests updated?
- Is rollback considered for risky changes?
- Is observability covered when behavior changes?
`,
  "definition-of-done.md": `# Definition of Done

A change is done when:

- Scope is clear
- Tests pass
- Decision/plan artifacts are updated when needed
- Rollback path is known for risky releases
- Owners are identified
`,
};

export const initProject = (options: InitOptions): string[] => {
  const { rootDir, workspaceName, force = false } = options;
  const created: string[] = [];
  const engineeringDir = getEngineeringDir(rootDir);
  const configPath = getConfigPath(rootDir);

  if (existsSync(configPath) && !force) {
    throw new Error(
      `Project already initialized at ${configPath}. Use --force to overwrite.`,
    );
  }

  mkdirSync(engineeringDir, { recursive: true });
  created.push(engineeringDir);

  const config = createDefaultConfig(workspaceName);
  writeFileSync(configPath, configToYaml(config), "utf8");
  created.push(configPath);

  const standardsDir = join(engineeringDir, "standards");
  mkdirSync(standardsDir, { recursive: true });

  for (const [fileName, contents] of Object.entries(STANDARDS)) {
    const filePath = join(standardsDir, fileName);
    writeFileSync(filePath, contents, "utf8");
    created.push(filePath);
  }

  const templatesDir = join(engineeringDir, "templates");
  mkdirSync(templatesDir, { recursive: true });

  for (const [name, contents] of Object.entries(getAllBuiltInTemplates())) {
    const filePath = join(templatesDir, `${name}.md`);
    if (!existsSync(filePath) || force) {
      writeFileSync(filePath, contents, "utf8");
      created.push(filePath);
    }
  }

  const documentDirs = Object.values(config.documents).map((relative) =>
    join(rootDir, relative),
  );

  for (const dir of documentDirs) {
    mkdirSync(dir, { recursive: true });
    const keep = join(dir, ".gitkeep");
    if (!existsSync(keep)) {
      writeFileSync(keep, "", "utf8");
      created.push(keep);
    }
    created.push(dir);
  }

  return created;
};
