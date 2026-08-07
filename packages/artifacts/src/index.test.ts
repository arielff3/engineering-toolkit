import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDefaultConfig, configToYaml } from "@engineering-toolkit/config";
import {
  createArtifact,
  getArtifactById,
  listArtifacts,
  nextSequence,
  parseArtifactFile,
} from "./index";

const tempDirs: string[] = [];

const createProject = () => {
  const rootDir = mkdtempSync(join(tmpdir(), "eng-artifacts-"));
  tempDirs.push(rootDir);

  const config = createDefaultConfig("test-project");
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

describe("artifacts", () => {
  it("creates numbered artifact files with frontmatter", () => {
    const { rootDir, config } = createProject();

    const created = createArtifact({
      rootDir,
      config,
      type: "decision",
      title: "Provider architecture",
      owners: ["ariel"],
      status: "accepted",
      templateName: "decision",
      templateData: {
        problem: "Need multiple providers",
        alternatives: "Single provider",
        decision: "Use contracts",
        rollback: "Keep current provider",
        context: "",
        drivers: "",
        consequences: "",
        risks: "",
      },
    });

    expect(created.relativePath.replace(/\\/g, "/")).toBe(
      "docs/decisions/0001-provider-architecture.md",
    );
    expect(created.meta.id).toBe("decision-0001-provider-architecture");

    const parsed = parseArtifactFile(created.absolutePath);
    expect(parsed).not.toBeNull();
    expect(parsed?.meta.title).toBe("Provider architecture");
    expect(parsed?.meta.owners).toEqual(["ariel"]);
    expect(parsed?.body).toContain("# Rollback");
    expect(parsed?.body).toContain("Keep current provider");
  });

  it("increments sequence and lists artifacts", () => {
    const { rootDir, config } = createProject();

    expect(nextSequence(rootDir, config, "decision")).toBe(1);

    createArtifact({
      rootDir,
      config,
      type: "decision",
      title: "First",
      templateName: "decision",
      templateData: {
        problem: "p",
        alternatives: "a",
        decision: "d",
        rollback: "r",
      },
    });

    expect(nextSequence(rootDir, config, "decision")).toBe(2);

    createArtifact({
      rootDir,
      config,
      type: "decision",
      title: "Second",
      templateName: "decision",
      templateData: {
        problem: "p",
        alternatives: "a",
        decision: "d",
        rollback: "r",
      },
    });

    const listed = listArtifacts(rootDir, config, "decision");
    expect(listed).toHaveLength(2);
    expect(listed[0]?.meta.id).toBe("decision-0001-first");
    expect(listed[1]?.meta.id).toBe("decision-0002-second");
  });

  it("gets artifact by id", () => {
    const { rootDir, config } = createProject();

    const created = createArtifact({
      rootDir,
      config,
      type: "plan",
      title: "Ship CLI",
      templateName: "plan",
      templateData: {
        objective: "Ship",
        testing: "Unit tests",
        monitoring: "Logs",
        rollback: "Revert",
      },
    });

    const found = getArtifactById(rootDir, config, created.meta.id);
    expect(found?.meta.title).toBe("Ship CLI");
    expect(getArtifactById(rootDir, config, "missing")).toBeNull();
  });

  it("returns null for invalid artifact files", () => {
    const { rootDir } = createProject();
    const filePath = join(rootDir, "broken.md");
    writeFileSync(filePath, "# no frontmatter\n", "utf8");
    expect(parseArtifactFile(filePath)).toBeNull();
  });
});
