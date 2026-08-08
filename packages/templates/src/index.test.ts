import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  findUnusedData,
  getPlaceholderNames,
  getTemplate,
  getTemplateFields,
  humanizeFieldName,
  render,
  resolveTemplate,
  resolveTemplateFields,
} from "./index";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("templates", () => {
  it("renders placeholders and falls back to TBD", () => {
    const output = render("decision", {
      problem: "Need providers",
      alternatives: "One vs many",
      decision: "Many",
      rollback: "Keep one",
    });

    expect(output).toContain("Need providers");
    expect(output).toContain("_TBD_");
  });

  it("loads custom templates from .engineering/templates", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "eng-templates-"));
    tempDirs.push(rootDir);

    mkdirSync(join(rootDir, ".engineering", "templates"), { recursive: true });
    writeFileSync(
      join(rootDir, ".engineering", "templates", "decision.md"),
      "# Custom\n\n{{problem}}\n",
      "utf8",
    );

    expect(getTemplate("decision", { rootDir })).toContain("# Custom");
    expect(render("decision", { problem: "Custom problem" }, { rootDir })).toBe(
      "# Custom\n\nCustom problem\n",
    );
  });
});

describe("humanizeFieldName", () => {
  it("splits camelCase and sentence-cases the result", () => {
    expect(humanizeFieldName("outOfScope")).toBe("Out of scope");
    expect(humanizeFieldName("missingItems")).toBe("Missing items");
    expect(humanizeFieldName("rollback")).toBe("Rollback");
  });
});

describe("getTemplateFields", () => {
  it("labels a placeholder with the nearest heading", () => {
    expect(getTemplateFields("# Audience\n\n{{audience}}\n")).toEqual([
      { name: "audience", label: "Audience" },
    ]);
  });

  it("labels an inline placeholder with the text before it", () => {
    expect(
      getTemplateFields("# Checklist\n\n- Tests defined: {{checklistTesting}}"),
    ).toEqual([{ name: "checklistTesting", label: "Tests defined" }]);
  });

  it("falls back to the humanized field name with no heading", () => {
    expect(getTemplateFields("{{outOfScope}}")).toEqual([
      { name: "outOfScope", label: "Out of scope" },
    ]);
  });

  it("keeps template order and drops duplicates", () => {
    const fields = getTemplateFields(
      "# A\n\n{{first}}\n\n# B\n\n{{second}}\n\n# C\n\n{{first}}\n",
    );

    expect(fields.map((field) => field.name)).toEqual(["first", "second"]);
  });

  it("reads every section of the built-in plan template", () => {
    const fields = resolveTemplateFields("plan");

    expect(fields.map((field) => field.name)).toEqual([
      "objective",
      "scope",
      "outOfScope",
      "dependencies",
      "architecture",
      "tasks",
      "testing",
      "monitoring",
      "rollout",
      "rollback",
    ]);
    expect(fields.map((field) => field.label)).toContain("Out of Scope");
  });

  it("reads every section of the built-in research template", () => {
    const fields = resolveTemplateFields("research");

    expect(fields).toEqual([
      { name: "question", label: "Question" },
      { name: "context", label: "Why It Matters" },
      { name: "options", label: "Options Compared" },
      { name: "sources", label: "Sources" },
      { name: "findings", label: "Findings" },
      { name: "tradeoffs", label: "Trade-offs" },
      { name: "openQuestions", label: "Open Questions" },
      { name: "recommendation", label: "Recommendation" },
      { name: "decisionToInform", label: "Decision To Inform" },
    ]);
  });

  it("picks up sections added to a custom template", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "eng-fields-"));
    tempDirs.push(rootDir);

    mkdirSync(join(rootDir, ".engineering", "templates"), { recursive: true });
    writeFileSync(
      join(rootDir, ".engineering", "templates", "vision.md"),
      "# North Star\n\n{{northStar}}\n\n# Anti-goals\n\n{{antiGoals}}\n",
      "utf8",
    );

    expect(resolveTemplateFields("vision", { rootDir })).toEqual([
      { name: "northStar", label: "North Star" },
      { name: "antiGoals", label: "Anti-goals" },
    ]);
  });
});

describe("getPlaceholderNames", () => {
  it("lists placeholders in order, without duplicates", () => {
    expect(getPlaceholderNames("{{a}} {{b}}\n{{a}}")).toEqual(["a", "b"]);
  });

  it("returns an empty list for a template with no placeholders", () => {
    expect(getPlaceholderNames("# Just a heading")).toEqual([]);
  });
});

describe("findUnusedData", () => {
  it("reports values the template cannot render", () => {
    expect(
      findUnusedData("# Question\n\n{{question}}", {
        question: "SQS or RabbitMQ?",
        tradeoffs: "SQS locks us to AWS",
        openQuestions: "Ordering guarantees?",
      }),
    ).toEqual(["tradeoffs", "openQuestions"]);
  });

  it("ignores empty and whitespace-only values", () => {
    expect(
      findUnusedData("{{question}}", {
        question: "Kept",
        tradeoffs: "",
        openQuestions: "   ",
      }),
    ).toEqual([]);
  });

  it("reports nothing when the template covers every key", () => {
    expect(
      findUnusedData("{{a}} {{b}}", { a: "one", b: "two" }),
    ).toEqual([]);
  });

  it("catches a custom template that predates a new section", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "eng-drift-"));
    tempDirs.push(rootDir);

    mkdirSync(join(rootDir, ".engineering", "templates"), { recursive: true });
    writeFileSync(
      join(rootDir, ".engineering", "templates", "research.md"),
      "# Question\n\n{{question}}\n\n# Findings\n\n{{findings}}\n",
      "utf8",
    );

    const template = resolveTemplate("research", { rootDir });

    expect(template.customPath).toContain("research.md");
    expect(
      findUnusedData(template.content, {
        question: "SQS or RabbitMQ?",
        options: "SQS, RabbitMQ, Postgres-backed queue",
        findings: "SQS p99 is 40ms",
        tradeoffs: "SQS locks us to AWS",
        openQuestions: "Ordering guarantees?",
        recommendation: "Start with SQS",
        decisionToInform: "Queue technology for checkout",
      }),
    ).toEqual([
      "options",
      "tradeoffs",
      "openQuestions",
      "recommendation",
      "decisionToInform",
    ]);
  });
});

describe("resolveTemplate", () => {
  it("has no customPath when the built-in template is used", () => {
    expect(resolveTemplate("research").customPath).toBeUndefined();
  });
});
