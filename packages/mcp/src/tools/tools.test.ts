import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { configToYaml, createDefaultConfig } from "@engineering-toolkit/config";
import { listArtifactsHandler } from "./list-artifacts";
import { getArtifactHandler } from "./get-artifact";
import { createArtifactHandler } from "./create-artifact";
import { createDecisionHandler } from "./create-decision";
import { createPlanHandler } from "./create-plan";
import { runChecksHandler } from "./run-checks";
import { workspaceSummaryHandler } from "./workspace-summary";
import type { ToolContext } from "./types";

const tempDirs: string[] = [];

const createWorkspace = (name = "br-financial-kit"): ToolContext => {
  const rootDir = mkdtempSync(join(tmpdir(), "eng-mcp-"));
  tempDirs.push(rootDir);
  mkdirSync(join(rootDir, ".engineering"), { recursive: true });
  writeFileSync(
    join(rootDir, ".engineering", "config.yml"),
    configToYaml(createDefaultConfig(name)),
    "utf8",
  );
  return { rootDir };
};

/** A directory with no `.engineering/config.yml`. */
const createBareDir = (): ToolContext => {
  const rootDir = mkdtempSync(join(tmpdir(), "eng-bare-"));
  tempDirs.push(rootDir);
  return { rootDir };
};

const payload = (result: CallToolResult): any => {
  const first = result.content[0];

  if (!first || first.type !== "text") {
    throw new Error("Tool did not answer with a text block");
  }

  return JSON.parse(first.text);
};

const seedDecision = async (context: ToolContext, title: string) =>
  payload(
    await createDecisionHandler(context)({
      title,
      problem: "Financial integrations in Brazil require different APIs",
      alternatives: "Single SDK per bank; unified core with providers",
      decision: "Use provider contracts with independent provider packages",
      rollback: "Keep provider-specific behavior behind capabilities",
      owner: "ariel",
    }),
  );

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("list_artifacts", () => {
  it("returns an empty list for a fresh workspace", async () => {
    const context = createWorkspace();

    expect(payload(await listArtifactsHandler(context)({}))).toEqual({
      artifacts: [],
    });
  });

  it("summarizes artifacts with a POSIX workspace path", async () => {
    const context = createWorkspace();
    await seedDecision(context, "Adopt provider-based architecture");

    const { artifacts } = payload(await listArtifactsHandler(context)({}));

    expect(artifacts).toEqual([
      {
        id: "decision-0001-adopt-provider-based-architecture",
        type: "decision",
        title: "Adopt provider-based architecture",
        status: "accepted",
        owners: ["ariel"],
        path: "docs/decisions/0001-adopt-provider-based-architecture.md",
      },
    ]);
  });

  it("filters by type", async () => {
    const context = createWorkspace();
    await seedDecision(context, "Adopt provider-based architecture");
    await createPlanHandler(context)({
      title: "Build v0.1",
      objective: "First usable version",
      testing: "Unit and contract tests",
      monitoring: "Structured errors",
      rollback: "Revise provider contracts",
    });

    const decisions = payload(
      await listArtifactsHandler(context)({ type: "decision" }),
    );
    const risks = payload(await listArtifactsHandler(context)({ type: "risk" }));

    expect(decisions.artifacts).toHaveLength(1);
    expect(risks.artifacts).toEqual([]);
  });
});

describe("get_artifact", () => {
  it("returns the metadata and the full body", async () => {
    const context = createWorkspace();
    const created = await seedDecision(context, "Adopt provider-based architecture");

    const artifact = payload(
      await getArtifactHandler(context)({ id: created.id }),
    );

    expect(artifact.id).toBe(created.id);
    expect(artifact.type).toBe("decision");
    expect(artifact.status).toBe("accepted");
    expect(artifact.path).toBe(created.path);
    expect(artifact.body).toContain("# Decision");
    expect(artifact.body).toContain(
      "Use provider contracts with independent provider packages",
    );
  });

  it("reports an unknown id as a tool error, not a crash", async () => {
    const context = createWorkspace();

    const result = await getArtifactHandler(context)({ id: "decision-9999-ghost" });

    expect(result.isError).toBe(true);
    expect(payload(result).error).toContain("Artifact not found: decision-9999-ghost");
    expect(payload(result).error).toContain("engineering_list_artifacts");
  });
});

describe("create tools", () => {
  it("fills the decision template and defaults to accepted", async () => {
    const context = createWorkspace();

    const created = await seedDecision(context, "Adopt provider-based architecture");

    expect(created).toEqual({
      id: "decision-0001-adopt-provider-based-architecture",
      path: "docs/decisions/0001-adopt-provider-based-architecture.md",
    });

    const body = payload(await getArtifactHandler(context)({ id: created.id })).body;
    expect(body).toContain("# Rollback\n\nKeep provider-specific behavior");
  });

  it("fills the plan template and defaults to draft", async () => {
    const context = createWorkspace();

    const created = payload(
      await createPlanHandler(context)({
        title: "Build br-financial-kit v0.1",
        objective: "Create the first usable version",
        testing: "Unit tests, contract tests, provider mock tests",
        monitoring: "Expose structured errors and request metadata",
        rollback: "Revise provider contracts before adding a second provider",
        outOfScope: "Boletos, Open Finance, CNAB",
        owner: "ariel",
        relatedArtifacts: ["decision-0001-adopt-provider-based-architecture"],
      }),
    );

    expect(created.path).toBe("docs/plans/0001-build-br-financial-kit-v0-1.md");

    const artifact = payload(await getArtifactHandler(context)({ id: created.id }));
    expect(artifact.status).toBe("draft");
    expect(artifact.body).toContain("# Out of Scope\n\nBoletos, Open Finance, CNAB");
    expect(artifact.body).toContain("# Monitoring\n\nExpose structured errors");
  });

  it("creates any type from template data and marks unfilled sections TBD", async () => {
    const context = createWorkspace();

    const created = payload(
      await createArtifactHandler(context)({
        type: "research",
        title: "First provider selection",
        data: {
          question: "Which provider should be implemented first?",
          recommendation: "Start with Core + PIX + Provider Efí.",
        },
        owners: ["ariel"],
        tags: ["mvp", "providers"],
      }),
    );

    expect(created).toEqual({
      id: "research-0001-first-provider-selection",
      path: "docs/research/0001-first-provider-selection.md",
    });

    const artifact = payload(await getArtifactHandler(context)({ id: created.id }));
    expect(artifact.owners).toEqual(["ariel"]);
    expect(artifact.status).toBe("draft");
    expect(artifact.body).toContain(
      "# Question\n\nWhich provider should be implemented first?",
    );
    expect(artifact.body).toContain("# Findings\n\n_TBD_");
  });
});

describe("run_checks", () => {
  it("reports a failing workspace with suggestions", async () => {
    const context = createWorkspace();

    const report = payload(await runChecksHandler(context)({}));

    expect(report.result).toBe("failed");
    const decisionCheck = report.checks.find(
      (check: { id: string }) => check.id === "decision-document",
    );
    expect(decisionCheck).toMatchObject({
      id: "decision-document",
      name: "Decision document",
      status: "failed",
    });
    expect(decisionCheck.suggestion).toBeTruthy();
  });

  it("passes once the workspace has an owned decision", async () => {
    const context = createWorkspace();
    await seedDecision(context, "Adopt provider-based architecture");

    expect(payload(await runChecksHandler(context)({})).result).toBe("passed");
  });
});

describe("workspace_summary", () => {
  it("reports counts, accepted decisions, active plans and open risks", async () => {
    const context = createWorkspace();
    await seedDecision(context, "Adopt provider-based architecture");
    await createPlanHandler(context)({
      title: "Build br-financial-kit v0.1",
      objective: "First usable version",
      testing: "Unit and contract tests",
      monitoring: "Structured errors",
      rollback: "Revise provider contracts",
      owner: "ariel",
    });
    await createArtifactHandler(context)({
      type: "risk",
      title: "Provider abstraction bias",
      data: { risk: "The core may be biased toward the first provider" },
      owners: ["ariel"],
    });

    const summary = payload(await workspaceSummaryHandler(context)({}));

    expect(summary.workspace).toEqual({ name: "br-financial-kit" });
    expect(summary.counts).toEqual({
      visions: 0,
      roadmaps: 0,
      research: 0,
      briefs: 0,
      decisions: 1,
      plans: 1,
      reviews: 0,
      risks: 1,
      runbooks: 0,
    });
    expect(summary.acceptedDecisions).toEqual([
      {
        id: "decision-0001-adopt-provider-based-architecture",
        title: "Adopt provider-based architecture",
      },
    ]);
    expect(summary.activePlans).toEqual([
      {
        id: "plan-0001-build-br-financial-kit-v0-1",
        title: "Build br-financial-kit v0.1",
      },
    ]);
    expect(summary.openRisks).toEqual([
      {
        id: "risk-0001-provider-abstraction-bias",
        title: "Provider abstraction bias",
      },
    ]);
    expect(summary.checks).toEqual({ result: "passed" });
  });

  it("leaves retired artifacts out of the active lists but keeps them counted", async () => {
    const context = createWorkspace();
    await createArtifactHandler(context)({
      type: "risk",
      title: "Old risk",
      status: "superseded",
    });
    await createArtifactHandler(context)({
      type: "plan",
      title: "Abandoned plan",
      status: "deprecated",
    });
    await createArtifactHandler(context)({
      type: "decision",
      title: "Proposed but not accepted",
      status: "proposed",
    });

    const summary = payload(await workspaceSummaryHandler(context)({}));

    expect(summary.counts.risks).toBe(1);
    expect(summary.counts.plans).toBe(1);
    expect(summary.counts.decisions).toBe(1);
    expect(summary.openRisks).toEqual([]);
    expect(summary.activePlans).toEqual([]);
    expect(summary.acceptedDecisions).toEqual([]);
  });

  it("includes the attached repository when the workspace has one", async () => {
    const context = createWorkspace();
    const config = createDefaultConfig("br-financial-kit");
    writeFileSync(
      join(context.rootDir, ".engineering", "config.yml"),
      configToYaml({
        ...config,
        workspace: {
          ...config.workspace,
          attachedRepository: "https://github.com/ariel/br-financial-kit",
        },
      }),
      "utf8",
    );

    const summary = payload(await workspaceSummaryHandler(context)({}));

    expect(summary.workspace).toEqual({
      name: "br-financial-kit",
      attachedRepository: "https://github.com/ariel/br-financial-kit",
    });
  });
});

describe("uninitialized workspace", () => {
  it("answers every read tool with a tool error instead of throwing", async () => {
    const context = createBareDir();

    for (const handler of [
      listArtifactsHandler(context),
      runChecksHandler(context),
      workspaceSummaryHandler(context),
    ]) {
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(payload(result).error).toContain("not initialized");
    }
  });

  it("answers write tools with a tool error too", async () => {
    const context = createBareDir();

    const result = await createDecisionHandler(context)({
      title: "Any decision",
      problem: "Any problem",
      alternatives: "Any alternatives",
      decision: "Any decision",
      rollback: "Any rollback",
    });

    expect(result.isError).toBe(true);
    expect(payload(result).error).toContain("not initialized");
  });
});
