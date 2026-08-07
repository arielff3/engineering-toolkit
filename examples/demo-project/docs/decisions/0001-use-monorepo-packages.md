---
id: decision-0001-use-monorepo-packages
type: decision
title: Use monorepo packages
status: accepted
owners:
  - ariel
createdAt: 2026-08-07T12:00:00.000Z
updatedAt: 2026-08-07T12:00:00.000Z
tags:
  - architecture
relatedArtifacts: []
---

# Context

Engineering Toolkit needs reusable modules for CLI, checks, and artifacts.

# Problem

A monolithic CLI makes it harder to evolve domain, templates, and checks independently.

# Decision Drivers

- Progressive adoption
- Clear package boundaries
- Framework-agnostic core

# Alternatives

1. Single package CLI
2. Monorepo with focused packages
3. Plugin-only architecture from day one

# Decision

Adopt a monorepo with `core`, `config`, `templates`, `artifacts`, `checks`, and `cli` packages.

# Consequences

- Per-package builds and versioning
- Explicit internal dependencies via workspace

# Risks

- Initial packaging overhead

# Rollback

Consolidate packages into a single module if overhead outweighs the benefit.
