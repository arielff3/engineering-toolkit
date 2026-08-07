import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDefaultConfig, configToYaml } from "@engineering-toolkit/config";
import { decideFromInput } from "./decide";
import { planFromInput } from "./plan";
import { reviewFromInput } from "./review";

const tempDirs: string[] = [];

const createProject = () => {
  const rootDir = mkdtempSync(join(tmpdir(), "eng-cli-"));
  tempDirs.push(rootDir);
  const config = createDefaultConfig("cli-project");
  mkdirSync(join(rootDir, ".engineering"), { recursive: true });
  writeFileSync(
    join(rootDir, ".engineering", "config.yml"),
    configToYaml(config),
    "utf8",
  );
  return rootDir;
};

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("non-interactive commands", () => {
  it("creates a decision from input flags", () => {
    const rootDir = createProject();

    const relativePath = decideFromInput(rootDir, {
      title: "Provider architecture",
      problem: "We need multiple providers",
      alternatives: "Single provider, plugin providers",
      decision: "Use provider contracts",
      rollback: "Keep current provider implementation",
      owner: "ariel",
      status: "accepted",
    });

    expect(relativePath.replace(/\\/g, "/")).toBe(
      "docs/decisions/0001-provider-architecture.md",
    );

    const content = readFileSync(join(rootDir, relativePath), "utf8");
    expect(content).toContain("Use provider contracts");
    expect(content).toContain("owners:\n  - ariel");
  });

  it("requires mandatory decision fields", () => {
    const rootDir = createProject();

    expect(() =>
      decideFromInput(rootDir, {
        title: "Incomplete",
        problem: "",
        alternatives: "",
        decision: "",
        rollback: "",
      }),
    ).toThrow(/Missing required options/);
  });

  it("creates plan and review from input", () => {
    const rootDir = createProject();

    const planPath = planFromInput(rootDir, {
      title: "Ship v0.2",
      objective: "Automation",
      testing: "Vitest",
      monitoring: "JSON checks",
      rollback: "Disable flags",
      owner: "ariel",
    });

    const reviewPath = reviewFromInput(rootDir, {
      title: "Review automation",
      context: "Non-interactive CLI",
      review: "Looks good",
      recommendation: "Approve",
      checklistDecision: "yes",
      owner: "ariel",
    });

    expect(planPath.replace(/\\/g, "/")).toContain("docs/plans/");
    expect(reviewPath.replace(/\\/g, "/")).toContain("docs/reviews/");
  });
});
