import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDefaultConfig, configToYaml } from "@engineering-toolkit/config";
import { createArtifact } from "@engineering-toolkit/artifacts";
import {
  createCheckContext,
  decisionDocumentCheck,
  ownerCheck,
  rollbackCheck,
  runChecks,
  testingCheck,
} from "./index";

const tempDirs: string[] = [];

const createProject = () => {
  const rootDir = mkdtempSync(join(tmpdir(), "eng-checks-"));
  tempDirs.push(rootDir);
  const config = createDefaultConfig("checks-project");
  mkdirSync(join(rootDir, ".engineering"), { recursive: true });
  writeFileSync(
    join(rootDir, ".engineering", "config.yml"),
    configToYaml(config),
    "utf8",
  );
  return { rootDir, config };
};

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("checks", () => {
  it("fails decision document check when empty", async () => {
    const { rootDir, config } = createProject();
    const context = createCheckContext(rootDir, config);
    const result = await decisionDocumentCheck.run(context);
    expect(result.status).toBe("failed");
  });

  it("passes core checks for a complete decision and plan", async () => {
    const { rootDir, config } = createProject();

    createArtifact({
      rootDir,
      config,
      type: "decision",
      title: "Use plugins",
      owners: ["ariel"],
      templateName: "decision",
      templateData: {
        problem: "Need extensibility",
        alternatives: "Monolith",
        decision: "Plugins",
        rollback: "Merge packages",
      },
    });

    createArtifact({
      rootDir,
      config,
      type: "plan",
      title: "Implement plugins",
      owners: ["ariel"],
      templateName: "plan",
      templateData: {
        objective: "Ship plugins",
        testing: "Unit + integration",
        monitoring: "CLI metrics",
        rollback: "Disable plugins",
      },
    });

    const context = createCheckContext(rootDir, config);
    const { results, hasFailures } = await runChecks(context);

    expect(hasFailures).toBe(false);
    expect(results.every(({ result }) => result.status === "passed")).toBe(
      true,
    );
  });

  it("flags missing rollback and owner", async () => {
    const { rootDir, config } = createProject();

    createArtifact({
      rootDir,
      config,
      type: "decision",
      title: "Incomplete",
      owners: [],
      body: `# Context\n\nSomething\n\n# Rollback\n\n_TBD_\n`,
    });

    const context = createCheckContext(rootDir, config);

    const rollback = await rollbackCheck.run(context);
    expect(rollback.status).toBe("failed");

    const owner = await ownerCheck.run(context);
    expect(owner.status).toBe("failed");
  });

  it("flags missing testing section in plans", async () => {
    const { rootDir, config } = createProject();

    createArtifact({
      rootDir,
      config,
      type: "plan",
      title: "No tests",
      owners: ["ariel"],
      body: `# Objective\n\nShip\n\n# Monitoring\n\nLogs\n\n# Rollback\n\nRevert\n`,
    });

    const context = createCheckContext(rootDir, config);
    const result = await testingCheck.run(context);
    expect(result.status).toBe("failed");
  });
});
