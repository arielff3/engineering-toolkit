import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultConfig, configToYaml } from "@engineering-toolkit/config";
import { researchCommand, researchFromFlags, researchFromInput } from "./research";

const prompts = vi.hoisted(() => ({ input: vi.fn() }));

vi.mock("@inquirer/prompts", () => prompts);

const tempDirs: string[] = [];

const createProject = () => {
  const rootDir = mkdtempSync(join(tmpdir(), "eng-research-"));
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
  prompts.input.mockReset();

  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

interface PromptConfig {
  message: string;
  default?: string;
  validate?: (value: string) => true | string;
}

const scriptPrompts = (answers: Record<string, string>) => {
  const asked: PromptConfig[] = [];

  prompts.input.mockImplementation(async (config: PromptConfig) => {
    asked.push(config);
    return answers[config.message] ?? "";
  });

  return asked;
};

describe("research", () => {
  it("writes every answer to its section", () => {
    const rootDir = createProject();

    const relativePath = researchFromInput(rootDir, {
      title: "ADR tooling",
      question: "Which ADR tool fits our workflow?",
      context: "We keep losing decisions in chat",
      options: "adr-tools, log4brains, plain markdown",
      sources: "GitHub activity, adr.github.io, two internal repos",
      findings: "adr-tools is unmaintained since 2022",
      tradeoffs: "log4brains adds a build step",
      openQuestions: "Whether the team will keep writing them without CI",
      recommendation: "Plain markdown with a CLI wrapper",
      decisionToInform: "Whether to adopt an external ADR tool",
      owner: "ariel",
    });

    expect(relativePath.replace(/\\/g, "/")).toBe(
      "docs/research/0001-adr-tooling.md",
    );

    const content = readFileSync(join(rootDir, relativePath), "utf8");

    expect(content).toContain("type: research");
    expect(content).toContain("status: draft");
    expect(content).toContain("owners:\n  - ariel");
    expect(content).toContain("# Question\n\nWhich ADR tool fits our workflow?");
    expect(content).toContain("# Why It Matters\n\nWe keep losing decisions in chat");
    expect(content).toContain(
      "# Options Compared\n\nadr-tools, log4brains, plain markdown",
    );
    expect(content).toContain(
      "# Sources\n\nGitHub activity, adr.github.io, two internal repos",
    );
    expect(content).toContain("# Findings\n\nadr-tools is unmaintained since 2022");
    expect(content).toContain("# Trade-offs\n\nlog4brains adds a build step");
    expect(content).toContain(
      "# Open Questions\n\nWhether the team will keep writing them without CI",
    );
    expect(content).toContain(
      "# Recommendation\n\nPlain markdown with a CLI wrapper",
    );
    expect(content).toContain(
      "# Decision To Inform\n\nWhether to adopt an external ADR tool",
    );
  });

  it("requires question, options, findings and recommendation", () => {
    const rootDir = createProject();

    expect(() =>
      researchFromInput(rootDir, {
        title: "Incomplete",
        question: "",
        options: "",
        findings: "",
        recommendation: "",
      }),
    ).toThrow(
      /Missing required options: --question, --options, --findings, --recommendation/,
    );
  });

  it("marks unanswered optional sections as TBD", () => {
    const rootDir = createProject();

    const relativePath = researchFromInput(rootDir, {
      title: "Queue choice",
      question: "SQS or RabbitMQ?",
      options: "SQS, RabbitMQ",
      findings: "SQS has no ops burden",
      recommendation: "SQS",
    });

    const content = readFileSync(join(rootDir, relativePath), "utf8");

    expect(content).toContain("# Why It Matters\n\n_TBD_");
    expect(content).toContain("# Sources\n\n_TBD_");
    expect(content).toContain("# Trade-offs\n\n_TBD_");
    expect(content).toContain("# Open Questions\n\n_TBD_");
    expect(content).toContain("# Decision To Inform\n\n_TBD_");
  });

  it("creates from flags with tags, related ids and an explicit status", () => {
    const rootDir = createProject();

    const relativePath = researchFromFlags(rootDir, {
      title: "Cache layer",
      question: "Do we need a cache?",
      options: "Redis, in-memory, none",
      findings: "p99 is 400ms without cache",
      recommendation: "Start with in-memory",
      tag: ["performance,infra"],
      related: ["decision-0001-use-postgres"],
      status: "proposed",
    });

    const content = readFileSync(join(rootDir, relativePath), "utf8");

    expect(content).toContain("status: proposed");
    expect(content).toContain("tags:\n  - performance\n  - infra");
    expect(content).toContain(
      "relatedArtifacts:\n  - decision-0001-use-postgres",
    );
  });

  it("asks the eleven questions in order and writes the answers", async () => {
    const rootDir = createProject();

    const asked = scriptPrompts({
      "Research title": "Queue choice",
      "What question are you trying to answer?": "SQS or RabbitMQ?",
      "Why does this matter?": "Checkout retries are dropping orders",
      "What options did you compare?": "SQS, RabbitMQ, Postgres queue",
      "What sources did you check?": "AWS pricing page, two internal incidents",
      "What did you find?": "RabbitMQ needs a dedicated operator",
      "What are the trade-offs?": "SQS locks us into AWS",
      "What is still uncertain?": "Whether ordering guarantees matter here",
      "What is your recommendation?": "Use SQS",
      "What decision should this research inform?": "Queue for checkout retries",
      "Owner (optional)": "ariel",
    });

    const relativePath = await researchCommand({ rootDir });

    expect(asked.map((config) => config.message)).toEqual([
      "Research title",
      "What question are you trying to answer?",
      "Why does this matter?",
      "What options did you compare?",
      "What sources did you check?",
      "What did you find?",
      "What are the trade-offs?",
      "What is still uncertain?",
      "What is your recommendation?",
      "What decision should this research inform?",
      "Owner (optional)",
    ]);

    const content = readFileSync(join(rootDir, relativePath), "utf8");

    expect(content).toContain("# Question\n\nSQS or RabbitMQ?");
    expect(content).toContain(
      "# Why It Matters\n\nCheckout retries are dropping orders",
    );
    expect(content).toContain(
      "# Sources\n\nAWS pricing page, two internal incidents",
    );
    expect(content).toContain("# Findings\n\nRabbitMQ needs a dedicated operator");
    expect(content).toContain("# Trade-offs\n\nSQS locks us into AWS");
    expect(content).toContain(
      "# Open Questions\n\nWhether ordering guarantees matter here",
    );
    expect(content).toContain(
      "# Decision To Inform\n\nQueue for checkout retries",
    );
    expect(content).toContain("owners:\n  - ariel");
  });

  it("blocks empty answers on the required questions only", async () => {
    const rootDir = createProject();

    const asked = scriptPrompts({
      "Research title": "Queue choice",
      "What question are you trying to answer?": "SQS or RabbitMQ?",
      "What options did you compare?": "SQS, RabbitMQ",
      "What did you find?": "RabbitMQ needs an operator",
      "What is your recommendation?": "Use SQS",
    });

    await researchCommand({ rootDir });

    const validated = asked
      .filter((config) => config.validate?.("  ") !== undefined)
      .filter((config) => config.validate?.("  ") !== true)
      .map((config) => config.message);

    expect(validated).toEqual([
      "Research title",
      "What question are you trying to answer?",
      "What options did you compare?",
      "What did you find?",
      "What is your recommendation?",
    ]);
    expect(asked).toHaveLength(11);
  });

  it("offers flag values as prompt defaults", async () => {
    const rootDir = createProject();

    const asked = scriptPrompts({
      "Research title": "Queue choice",
      "What question are you trying to answer?": "SQS or RabbitMQ?",
      "What options did you compare?": "SQS, RabbitMQ",
      "What did you find?": "RabbitMQ needs an operator",
      "What is your recommendation?": "Use SQS",
    });

    await researchCommand({
      rootDir,
      defaults: { question: "Which queue?", owner: "ariel" },
    });

    const byMessage = new Map(asked.map((config) => [config.message, config]));

    expect(byMessage.get("What question are you trying to answer?")?.default).toBe(
      "Which queue?",
    );
    expect(byMessage.get("Owner (optional)")?.default).toBe("ariel");
  });

  it("rejects an unknown status", () => {
    const rootDir = createProject();

    expect(() =>
      researchFromFlags(rootDir, {
        title: "Cache layer",
        question: "Do we need a cache?",
        options: "Redis, none",
        findings: "p99 is 400ms",
        recommendation: "Start with in-memory",
        status: "maybe",
      }),
    ).toThrow(/Invalid status "maybe"/);
  });
});
