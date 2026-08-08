import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type TemplateName =
  | "vision"
  | "roadmap"
  | "research"
  | "brief"
  | "decision"
  | "plan"
  | "review"
  | "risk"
  | "runbook";

export type TemplateData = Record<string, string>;

export interface TemplateResolveOptions {
  rootDir?: string;
}

const visionTemplate = `# Vision

{{vision}}

# Problem

{{problem}}

# Audience

{{audience}}

# Principles

{{principles}}

# Success

{{success}}
`;

const roadmapTemplate = `# Goal

{{goal}}

# Milestones

{{milestones}}

# Now

{{now}}

# Next

{{next}}

# Later

{{later}}
`;

const researchTemplate = `# Question

{{question}}

# Why It Matters

{{context}}

# Options Compared

{{options}}

# Sources

{{sources}}

# Findings

{{findings}}

# Trade-offs

{{tradeoffs}}

# Open Questions

{{openQuestions}}

# Recommendation

{{recommendation}}

# Decision To Inform

{{decisionToInform}}
`;

const briefTemplate = `# Summary

{{summary}}

# Context

{{context}}

# Requirements

{{requirements}}

# Constraints

{{constraints}}

# Open Questions

{{openQuestions}}
`;

const decisionTemplate = `# Context

{{context}}

# Problem

{{problem}}

# Decision Drivers

{{drivers}}

# Alternatives

{{alternatives}}

# Decision

{{decision}}

# Consequences

{{consequences}}

# Risks

{{risks}}

# Rollback

{{rollback}}
`;

const planTemplate = `# Objective

{{objective}}

# Scope

{{scope}}

# Out of Scope

{{outOfScope}}

# Dependencies

{{dependencies}}

# Architecture

{{architecture}}

# Tasks

{{tasks}}

# Testing

{{testing}}

# Monitoring

{{monitoring}}

# Rollout

{{rollout}}

# Rollback

{{rollback}}
`;

const reviewTemplate = `# Context

{{context}}

# Decision Reference

{{decisionReference}}

# Review

{{review}}

# Checklist

- Decision registered: {{checklistDecision}}
- Tests defined: {{checklistTesting}}
- Rollback: {{checklistRollback}}
- Monitoring: {{checklistMonitoring}}
- Security: {{checklistSecurity}}
- Architectural impact: {{checklistArchitecture}}

# Risks

{{risks}}

# Missing Items

{{missingItems}}

# Recommendation

{{recommendation}}
`;

const riskTemplate = `# Risk

{{risk}}

# Impact

{{impact}}

# Likelihood

{{likelihood}}

# Mitigation

{{mitigation}}

# Owner

{{owner}}
`;

const runbookTemplate = `# Purpose

{{purpose}}

# Preconditions

{{preconditions}}

# Steps

{{steps}}

# Verification

{{verification}}

# Rollback

{{rollback}}
`;

const templates: Record<TemplateName, string> = {
  vision: visionTemplate,
  roadmap: roadmapTemplate,
  research: researchTemplate,
  brief: briefTemplate,
  decision: decisionTemplate,
  plan: planTemplate,
  review: reviewTemplate,
  risk: riskTemplate,
  runbook: runbookTemplate,
};

export const getBuiltInTemplate = (name: TemplateName): string => {
  const template = templates[name];

  if (!template) {
    throw new Error(`Unknown template: ${name}`);
  }

  return template;
};

export const getCustomTemplatePath = (
  rootDir: string,
  name: TemplateName,
): string => join(rootDir, ".engineering", "templates", `${name}.md`);

export const getTemplate = (
  name: TemplateName,
  options: TemplateResolveOptions = {},
): string => {
  if (options.rootDir) {
    const customPath = getCustomTemplatePath(options.rootDir, name);

    if (existsSync(customPath)) {
      return readFileSync(customPath, "utf8");
    }
  }

  return getBuiltInTemplate(name);
};

export const renderTemplateString = (
  template: string,
  data: TemplateData,
): string =>
  template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = data[key];
    return value === undefined || value === "" ? "_TBD_" : value;
  });

export interface TemplateField {
  name: string;
  label: string;
}

const HEADING_PATTERN = /^#+\s+(.+?)\s*$/;
const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;

export const humanizeFieldName = (name: string): string => {
  const spaced = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!spaced) {
    return name;
  }

  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
};

export const getTemplateFields = (template: string): TemplateField[] => {
  const fields: TemplateField[] = [];
  const seen = new Set<string>();
  let heading: string | undefined;

  for (const rawLine of template.split("\n")) {
    const line = rawLine.trim();
    const headingMatch = HEADING_PATTERN.exec(line);

    if (headingMatch) {
      heading = headingMatch[1] ?? heading;
      continue;
    }

    PLACEHOLDER_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null = PLACEHOLDER_PATTERN.exec(line);

    while (match !== null) {
      const name = match[1];

      if (name && !seen.has(name)) {
        seen.add(name);

        const inlinePrefix = line
          .slice(0, match.index)
          .replace(/^[-*+\s]+/, "")
          .replace(/[:\-\s]+$/, "")
          .trim();

        fields.push({
          name,
          label: inlinePrefix || heading || humanizeFieldName(name),
        });
      }

      match = PLACEHOLDER_PATTERN.exec(line);
    }
  }

  return fields;
};

export const resolveTemplateFields = (
  name: TemplateName,
  options: TemplateResolveOptions = {},
): TemplateField[] => getTemplateFields(getTemplate(name, options));

export const render = (
  name: TemplateName,
  data: TemplateData,
  options: TemplateResolveOptions = {},
): string => renderTemplateString(getTemplate(name, options), data);

export const listTemplates = (): TemplateName[] =>
  Object.keys(templates) as TemplateName[];

export const getAllBuiltInTemplates = (): Record<TemplateName, string> => ({
  ...templates,
});
