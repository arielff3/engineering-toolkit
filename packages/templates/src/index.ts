export type TemplateName = "decision" | "plan" | "review";

export type TemplateData = Record<string, string>;

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

const templates: Record<TemplateName, string> = {
  decision: decisionTemplate,
  plan: planTemplate,
  review: reviewTemplate,
};

export const getTemplate = (name: TemplateName): string => {
  const template = templates[name];

  if (!template) {
    throw new Error(`Unknown template: ${name}`);
  }

  return template;
};

export const render = (name: TemplateName, data: TemplateData): string => {
  const template = getTemplate(name);

  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = data[key];
    return value === undefined || value === "" ? "_TBD_" : value;
  });
};

export const listTemplates = (): TemplateName[] =>
  Object.keys(templates) as TemplateName[];
