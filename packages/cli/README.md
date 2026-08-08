# @engineering-toolkit/cli

> Engineering decisions as code.

The `eng` command-line interface for [Engineering Toolkit](https://github.com/arielff3/engineering-toolkit) — an open-source CLI that turns engineering practice into versioned artifacts and automated checks.

```bash
npx @engineering-toolkit/cli --help
```

Or install it:

```bash
npm install -g @engineering-toolkit/cli
eng --help
```

## What it does

Teams have endless tooling for writing code and almost none for structuring the decisions behind it. The usual loop is `Problem -> Prompt -> Code -> Merge`. This tool encourages a fuller one:

```text
Problem -> Context -> Alternatives -> Trade-offs -> Decision -> Plan -> Review -> Check
```

Every step produces a Markdown file with YAML frontmatter, committed with the project. Readable in an editor, diffable in a pull request, machine-checkable in CI.

## Quick start

```bash
eng init        # create a workspace (an existing repo or an empty folder)
eng research    # investigate options before committing to one
eng decide      # record the decision, with alternatives and a rollback
eng plan        # plan the implementation
eng list        # see what you have
eng check       # validate it, exits non-zero on failure
```

Every guided command also takes flags, so the same thing works unattended:

```bash
eng decide \
  --title "Provider architecture" \
  --problem "We need to support multiple payment providers" \
  --alternatives "Single provider, plugin providers" \
  --decision "Use provider contracts" \
  --rollback "Keep the current provider implementation" \
  --owner ariel
```

## Artifacts

Nine types, each with its own folder and template: `vision`, `roadmap`, `research`, `brief`, `decision`, `plan`, `review`, `risk`, `runbook`.

```markdown
---
id: decision-0001-use-monorepo-packages
type: decision
title: Use monorepo packages
status: accepted
owners:
  - ariel
tags:
  - architecture
---

# Context

...
```

## Checks

`eng check` validates that decisions exist, plans carry a test strategy and observability, decisions and plans have a rollback path, and every artifact has an owner. Each check is configurable as `required`, `optional` or `disabled`.

```bash
eng check --json   # machine-readable report for CI, exit code 1 on failure
```

## AI assistants

[`@engineering-toolkit/mcp`](https://www.npmjs.com/package/@engineering-toolkit/mcp) exposes the same workspace over the Model Context Protocol, so an assistant can read what the team already decided before proposing anything.

## Documentation

Full documentation, configuration reference and CI examples: **https://github.com/arielff3/engineering-toolkit**

## License

MIT
