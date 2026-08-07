---
id: plan-0001-ship-v0-1-cli
type: plan
title: Ship v0.1 CLI
status: accepted
owners:
  - ariel
createdAt: 2026-08-07T12:30:00.000Z
updatedAt: 2026-08-07T12:30:00.000Z
tags:
  - release
relatedArtifacts:
  - decision-0001-use-monorepo-packages
---

# Objective

Ship the `eng` CLI with `init`, `decide`, `plan`, `review`, and `check`.

# Scope

- Monorepo scaffold
- Domain packages
- Interactive commands and built-in checks

# Out of Scope

- Plugins
- GitHub Actions
- VSCode extension
- Dashboard

# Dependencies

- TypeScript
- pnpm workspaces
- Commander
- Zod
- YAML

# Architecture

CLI depends on internal packages; artifacts are markdown with frontmatter.

# Tasks

1. Scaffold
2. Core/config/templates
3. Artifacts/checks
4. CLI commands
5. Demo project

# Testing

Validate `eng init` and `eng check` on the demo project; review markdown produced by interactive flows.

# Monitoring

Clear terminal logs with passed/warning/failed status and exit code.

# Rollout

Publish v0.1 in the monorepo and document usage in the README.

# Rollback

Fall back to documentation-only if the CLI is not usable.
