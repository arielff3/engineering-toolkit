# Engineering Toolkit

> Engineering decisions as code.

Engineering Toolkit is an open-source CLI for turning software engineering practices into versioned artifacts and automated checks.

It helps teams record technical decisions, plan implementations, review changes, and validate important engineering requirements directly inside the repository.

The goal is not to replace human judgment.

The goal is to make good engineering decisions repeatable.

## Why

Modern teams have many tools for writing code, but much less tooling for structuring the decisions behind that code.

The usual flow is often:

```text
Problem -> Prompt -> Code -> Merge
```

Engineering Toolkit encourages a healthier flow:

```text
Problem -> Context -> Alternatives -> Trade-offs -> Decision -> Plan -> Review -> Check
```

The project starts with documentation, but it is not only a documentation tool. It is designed to become an executable engineering process layer for repositories.

## Principles

- Thinking before coding
- Decisions as code
- Progressive adoption
- Automation over manual documentation
- AI as reviewer, not decision maker
- Framework and language agnostic



## Requirements

- Node.js >= 18
- pnpm >= 9



## Setup

```bash
pnpm install
pnpm build
```

This produces the `eng` binary at:

```text
packages/cli/dist/index.js
```

Use it locally:

```bash
pnpm --filter @engineering-toolkit/cli exec eng --help
```

Or run the built CLI directly:

```bash
node packages/cli/dist/index.js --help
```

Optional global link:

```bash
pnpm --filter @engineering-toolkit/cli link --global
eng --help
```



## Commands



### `eng init`

Initializes Engineering Toolkit in a repository.

```bash
eng init
eng init --name my-project
eng init --force
```

Creates:

```text
.engineering/
  config.yml
  standards/
    architecture.md
    code-review.md
    definition-of-done.md
docs/
  decisions/
  plans/
  reviews/
  risks/
  runbooks/
```



### `eng decide`

Interactive flow to record a technical decision in `docs/decisions/`.

It captures:

- problem
- alternatives
- decision drivers and trade-offs
- decision
- consequences
- risks
- rollback plan
- owner



### `eng plan`

Interactive flow to plan an implementation in `docs/plans/`.

It captures:

- objective
- scope
- out of scope
- dependencies
- technical plan
- tasks
- testing strategy
- observability
- rollout
- rollback
- related decision



### `eng review`

Interactive engineering review flow in `docs/reviews/`.

It captures:

- context
- decision reference
- review notes
- checklist status
- risks
- missing items
- recommendation



### `eng list`

Lists existing engineering artifacts.

```bash
eng list
eng list --type decision
eng list --cwd ./examples/demo-project
```

Supported artifact types:

- `decision`
- `plan`
- `review`
- `risk`
- `runbook`



### `eng check`

Runs automated engineering validations.

```bash
eng check
eng check --cwd ./examples/demo-project
```

Current checks:

- decision document exists
- plans include testing strategy
- decisions and plans include rollback
- plans include observability
- artifacts have owners

Exit code is `1` when any required check fails.

## Example

```bash
pnpm build
node packages/cli/dist/index.js check --cwd examples/demo-project
node packages/cli/dist/index.js list --cwd examples/demo-project
```



## Monorepo Structure

```text
packages/
  cli/        Command-line interface
  core/       Shared domain types and contracts
  config/     Project configuration loading and validation
  templates/  Built-in artifact templates
  artifacts/  Artifact creation, parsing, and listing
  checks/     Automated engineering checks
examples/
  demo-project/
```



## Engineering Artifacts

Every important project fact is represented as an artifact.

```ts
interface EngineeringArtifact {
  id: string;
  type: ArtifactType;
  title: string;
  status: ArtifactStatus;
  owners: string[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
  relatedArtifacts: string[];
}
```

Artifacts are Markdown files with YAML frontmatter, so they stay readable, reviewable, and versioned with the project.

## Feature Log



### Implemented

- Workspace package structure with `cli`, `core`, `config`, `templates`, `artifacts`, and `checks`.
- `eng init` for creating `.engineering/`, standards, configuration, and document folders.
- `eng decide` interactive flow for decision records.
- `eng plan` interactive flow for implementation plans.
- `eng review` interactive flow for engineering reviews.
- `eng list` for listing artifacts, with optional filtering by type.
- `eng check` for automated validation of core engineering requirements.
- Built-in templates for decisions, plans, and reviews.
- YAML frontmatter metadata for artifacts.
- Demo project with example decision and plan artifacts.
- Build setup with TypeScript and tsup.



### In Progress / Next

- Non-interactive command options for `decide`, `plan`, and `review`.
- Automated tests for core artifact parsing, creation, and checks.
- Better CLI output formatting for lists and checks.
- JSON output mode for CI and future integrations.
- Custom templates loaded from `.engineering/templates`.
- More configurable check behavior.
- Artifact relationships and lookup by ID.



### Planned

- GitHub Actions integration.
- Pull Request comments from `eng check`.
- Public API change detection.
- Risk and runbook creation flows.
- Plugin system for external checks and integrations.
- VS Code extension.
- AI-assisted technical review.
- Web dashboard.



## Roadmap



### v0.1

- CLI foundation
- `init`
- `decide`
- `plan`
- `review`
- `list`
- `check`



### v0.2

- Non-interactive CLI mode
- Tests
- Improved artifact querying
- Custom templates



### v0.3

- CI-friendly output
- GitHub Actions
- Pull Request comments



### v0.4

- Plugin system



### v0.5

- VS Code extension



### v1.0

- Stable CLI, artifact model, configuration format, and check engine.



## What This Project Is Not

Engineering Toolkit does not intend to:

- generate application code automatically
- replace architecture work
- replace code review
- enforce one methodology
- become a framework

Its role is to support the engineering process by making decisions, plans, reviews, and standards visible and automatable.

## Long-Term Vision

Software is not just code.

Software is a sequence of decisions.

Engineering Toolkit exists to turn those decisions into versioned, executable, and shareable knowledge.

## License

MIT