# Engineering Toolkit

> Engineering decisions as code.

Engineering Toolkit is an open-source CLI that turns engineering practice into versioned artifacts and automated checks. You record a decision, plan the implementation, review the change, and validate the whole thing in CI — all from files that live next to the code.

The goal is not to replace human judgment. The goal is to make good engineering decisions repeatable.

> **Status: early.** v0.1, pre-release. The artifact format, config schema, and command surface can still change between minor versions. Not published to npm yet — build from source (see [Install](#install)).

## Why

Teams have endless tooling for writing code and almost none for structuring the decisions behind it. The usual loop is:

```text
Problem -> Prompt -> Code -> Merge
```

Engineering Toolkit encourages a fuller one:

```text
Problem -> Context -> Alternatives -> Trade-offs -> Decision -> Plan -> Review -> Check
```

Every step produces a Markdown file with YAML frontmatter, committed with the project. Readable in an editor, diffable in a pull request, and machine-checkable in CI.

### Principles

- **Thinking before coding.** Implementation starts once the problem is understood.
- **Decisions as code.** Important decisions are versioned with the project, not lost in chat.
- **Progressive adoption.** Useful even if you only ever run `eng decide`.
- **Automation over documentation.** If a rule can be checked, check it.
- **AI as reviewer.** AI challenges decisions; it does not make them. The [MCP server](#mcp-server) gives assistants the engineering memory to review against.
- **Language and framework agnostic.** It only cares about Markdown and a config file.

## Install

Requires Node.js >= 18 and pnpm >= 9.

```bash
git clone https://github.com/<your-org>/engineering-toolkit
cd engineering-toolkit
pnpm install
pnpm build
```

The build produces an executable CLI at `packages/cli/dist/index.js`:

```bash
node packages/cli/dist/index.js --help
```

To get a real `eng` command on your PATH while developing:

```bash
cd packages/cli
pnpm link --global
eng --help
```

The rest of this README writes `eng` for brevity.

## Quick start

```bash
# 1. Create a workspace (works in an existing repo or an empty folder)
eng init

# 2. Investigate the options — prompts you through question, options, findings, recommendation
eng research

# 3. Record a decision — prompts you through problem, alternatives, trade-offs, rollback
eng decide

# 4. Plan the implementation
eng plan

# 5. See what you have
eng list

# 6. Validate it
eng check
```

`eng check` prints a report and exits non-zero when a required check fails:

```text
Engineering Check

✓ Decision document
  1 decision document(s) found

✓ Test strategy
  Test strategy documented in plans

✗ Rollback
  Rollback missing in 1 artifact(s)
  → Add a filled # Rollback section to decisions and plans

✓ Observability
  Observability documented in plans

✗ Owner
  1 artifact(s) missing owner
  → Add owners in the frontmatter of each artifact

Result: failed
```

## Concepts

### Artifacts

Every important project fact is an artifact: a Markdown file with YAML frontmatter.

```markdown
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
...
```

Nine artifact types, each with its own folder and template:

| Type | Default folder | Answers |
| --- | --- | --- |
| `vision` | `docs/visions` | Where are we going? |
| `roadmap` | `docs/roadmaps` | In what order? |
| `research` | `docs/research` | What already exists? |
| `brief` | `docs/briefs` | What exactly are we building? |
| `decision` | `docs/decisions` | What did we choose, and why? |
| `plan` | `docs/plans` | How will we ship it? |
| `review` | `docs/reviews` | Did we miss anything? |
| `risk` | `docs/risks` | What could go wrong? |
| `runbook` | `docs/runbooks` | What do we do at 3am? |

Statuses: `draft`, `proposed`, `accepted`, `deprecated`, `superseded`.

Files are numbered per type (`0001-`, `0002-`, …) and the id is `<type>-<sequence>-<slug>`.

### Workspace first

Engineering Toolkit does not require an existing codebase. Start with an empty folder:

```bash
eng new ./my-idea --name "My Idea"
```

Capture vision, research, roadmap, and decisions while the work is still just an engineering conversation. When a repository finally exists, link it:

```bash
eng attach --repo https://github.com/my-org/my-project
```

The code becomes one result of the engineering process, not the place where engineering begins.

### Checks

A check reads the artifacts in the workspace and returns `passed`, `warning`, or `failed`. Each one is configurable as `required`, `optional`, or `disabled` — an `optional` check that does not pass reports a warning instead of a failure, and a `disabled` one always passes.

| Check | What it looks at |
| --- | --- |
| `decision-document` | At least one decision exists |
| `testing` | Every plan has a filled `# Testing` section |
| `rollback` | Every decision and plan has a filled `# Rollback` section |
| `observability` | Every plan has a filled `# Monitoring` section |
| `owner` | Every artifact lists at least one owner |

A section counts as filled when it has content other than the `_TBD_` placeholder. Freshly generated artifacts are full of `_TBD_` on purpose, so `eng check` tells you exactly what is still unanswered.

## Commands

### `eng init`

Initializes a workspace in the current folder.

```bash
eng init                      # prompts for the name, defaulting to the folder name
eng init --name my-project    # no prompt
eng init --force              # overwrite an existing config
```

Creates:

```text
.engineering/
  config.yml
  standards/
    architecture.md
    code-review.md
    definition-of-done.md
  templates/          # one .md per artifact type, yours to edit
docs/
  visions/  roadmaps/  research/  briefs/
  decisions/  plans/  reviews/  risks/  runbooks/
```

### `eng new` / `eng workspace create`

Same thing, but takes a target directory — useful before a repository exists.

```bash
eng new ./my-product --name "My Product"
eng workspace create ./my-product
```

### `eng attach`

Records the repository this workspace belongs to, in `workspace.attachedRepository`.

```bash
eng attach                                             # prompts, pre-filled with the current value
eng attach --repo https://github.com/my-org/my-project
```

### `eng research`, `eng decide`, `eng plan`, `eng review`

The four guided flows, in the order the work usually happens. Each one prompts you through its questions and writes an artifact.

```bash
eng research # question, why it matters, options, sources, findings, trade-offs, open questions, recommendation
eng decide   # problem, alternatives, trade-offs, decision, consequences, risks, rollback
eng plan     # objective, scope, dependencies, tasks, testing, monitoring, rollout, rollback
eng review   # context, analysis, checklist, risks, missing items, recommendation
```

`eng research` is the step before committing to anything: it compares options and ends on a recommendation plus the decision that recommendation should inform. It writes status `draft` — a research artifact reports, it does not commit. When you act on it, run `eng decide` and point it back with `--related`.

Every question also has a flag, so the same commands work in scripts and CI:

```bash
eng research \
  --title "Queue for checkout retries" \
  --question "SQS or RabbitMQ for retrying failed checkouts?" \
  --options "SQS, RabbitMQ, Postgres-backed queue" \
  --sources "AWS pricing page, two internal incident reports" \
  --findings "RabbitMQ needs a dedicated operator; SQS p99 is 40ms" \
  --recommendation "Start with SQS" \
  --decision-to-inform "Queue technology for checkout" \
  --owner ariel
```

```bash
eng decide \
  --title "Provider architecture" \
  --problem "We need to support multiple payment providers" \
  --alternatives "Single provider, plugin providers" \
  --decision "Use provider contracts" \
  --rollback "Keep the current provider implementation" \
  --owner ariel
```

```bash
eng plan \
  --title "Ship provider contracts" \
  --objective "Standardize providers" \
  --testing "Unit + conformance tests" \
  --monitoring "Provider health logs" \
  --rollback "Keep current adapters"
```

```bash
eng review \
  --title "Review provider architecture" \
  --context "Provider contracts decision" \
  --review "Contracts are clear, conformance suite is missing" \
  --recommendation "Approve with changes" \
  --checklist-decision yes
```

Required flags per command:

| Command | Required |
| --- | --- |
| `eng research` | `--title --question --options --findings --recommendation` |
| `eng decide` | `--title --problem --alternatives --decision --rollback` |
| `eng plan` | `--title --objective --testing --monitoring --rollback` |
| `eng review` | `--title --context --review --recommendation` |

Shared optional flags: `--owner`, `--tag` (repeatable or comma-separated), `--related`, `--status`, and `-C, --cwd <path>` to target another workspace. `eng research` also takes `--context` (why it matters), `--tradeoffs` and `--decision-to-inform`. `eng review` always writes status `proposed`.

See [Interactive mode](#interactive-mode) for how the CLI decides whether to prompt.

### `eng create`

The guided flow for the other six types — and for any type at all.

```bash
eng create
```

Asks for the artifact type, the title, then **one question per section of the template**, and finally owner, tags and related ids.

The questions are read from the template file itself, not hard-coded. Add a section to `.engineering/templates/vision.md` and `eng create vision` starts asking about it — no code change, no release. The prompt label comes from the nearest heading:

```markdown
# North Star          ->  prompt: "North Star"

{{northStar}}
```

Every question also has a flag, so the same command scripts cleanly:

```bash
eng create vision   --title "Engineering Toolkit Vision" --data vision="Technical decisions as code"
eng create roadmap  --title "v0 Roadmap" --data now="CLI workspace" --data next="GitHub integration"
eng create research --title "ADR tools research" --data question="What exists today?"
eng create risk     --title "Provider outage" --data impact="Payments fail, revenue stops"
```

`--data` is repeatable, one `key=value` per occurrence, and the value is taken verbatim after the first `=` — commas and further `=` signs are preserved. Unfilled placeholders render as `_TBD_`.

Passing both a type and `--title` is enough to skip the prompts entirely, which keeps existing scripts working. Use `-i` when you want the questions anyway.

Placeholders per template:

| Template | Placeholders |
| --- | --- |
| `vision` | `vision`, `problem`, `audience`, `principles`, `success` |
| `roadmap` | `goal`, `milestones`, `now`, `next`, `later` |
| `research` | `question`, `context`, `options`, `sources`, `findings`, `tradeoffs`, `openQuestions`, `recommendation`, `decisionToInform` |
| `brief` | `summary`, `context`, `requirements`, `constraints`, `openQuestions` |
| `decision` | `context`, `problem`, `drivers`, `alternatives`, `decision`, `consequences`, `risks`, `rollback` |
| `plan` | `objective`, `scope`, `outOfScope`, `dependencies`, `architecture`, `tasks`, `testing`, `monitoring`, `rollout`, `rollback` |
| `review` | `context`, `decisionReference`, `review`, `checklist*`, `risks`, `missingItems`, `recommendation` |
| `risk` | `risk`, `impact`, `likelihood`, `mitigation`, `owner` |
| `runbook` | `purpose`, `preconditions`, `steps`, `verification`, `rollback` |

### `eng list`

```bash
eng list
eng list --type decision
eng list --cwd ./examples/demo-project
```

### `eng show`

```bash
eng show decision-0001-provider-architecture
eng show decision-0001-provider-architecture --json
```

Exits `1` when the id does not exist.

### `eng check`

```bash
eng check
eng check --json
eng check --cwd ./examples/demo-project
```

Exits `1` when any `required` check fails. Warnings do not fail the run.

## Interactive mode

Five commands ask questions: `create`, `decide`, `plan`, `review` and `attach`. Each one can also take every answer as a flag, and each can be switched off individually.

**Per command, in `.engineering/config.yml`:**

```yaml
interactive:
  create: true
  decide: true
  plan: true
  review: false   # this one now demands flags and fails instead of asking
  attach: true
```

Useful when a team wants decisions captured by hand but reviews generated by a bot, or when a shared machine should never block on a prompt.

**Precedence**, highest first:

1. `-y` / `--yes` / `--non-interactive` — never prompt.
2. `-i` / `--interactive` — prompt, overriding the config for this one run.
3. `interactive.<command>: false` in the config.
4. No terminal attached — a pipe, a CI job, or `ENG_NON_INTERACTIVE=1`.
5. Every required flag already present — nothing left to ask.

Otherwise: prompt.

Two properties worth knowing. A **partially** specified command opens the prompts with your flags **pre-filled** rather than discarding them — `eng decide --title "X"` gets you a title-filled form, not an error. And when a required flag is missing in a non-interactive run, the error tells you why it did not simply ask:

```text
Missing required options: --problem, --alternatives
Prompting was skipped because interactive.decide is false in .engineering/config.yml.
```

`eng init` and `eng new` also prompt — for the workspace name, defaulting to the folder name. They are not in the config table for the obvious reason: they run before the config exists. `--name`, `--yes` or a missing terminal all skip that prompt.

## Configuration

`.engineering/config.yml`:

```yaml
version: 1

workspace:
  name: br-financial-kit
  attachedRepository: https://github.com/my-org/br-financial-kit

project:
  name: br-financial-kit

documents:
  visions: docs/visions
  roadmaps: docs/roadmaps
  research: docs/research
  briefs: docs/briefs
  decisions: docs/decisions
  plans: docs/plans
  reviews: docs/reviews
  risks: docs/risks
  runbooks: docs/runbooks

checks:
  rollback: required
  owner: required
  observability: required
  testing: required
  decisionDocument: required

interactive:
  create: true
  research: true
  decide: true
  plan: true
  review: true
  attach: true
```

Every key is optional and falls back to the value above. Point `documents.*` anywhere you like — an existing `adr/` folder, for example. Set any check to `optional` to downgrade it to a warning, or `disabled` to skip it. Set any `interactive.*` to `false` to make that command flags-only (see [Interactive mode](#interactive-mode)). Keys the CLI does not recognize are preserved when it rewrites the file.

## Custom templates

`eng init` copies all nine built-in templates into `.engineering/templates/`. Edit any of them and the CLI uses your version; delete one and it falls back to the built-in.

```text
.engineering/templates/
  vision.md  roadmap.md  research.md  brief.md
  decision.md  plan.md  review.md  risk.md  runbook.md
```

Placeholders use `{{name}}` syntax and render as `_TBD_` when no value is supplied.

### Template drift

A custom template you copied on `eng init` does not change when the built-in one does. If a later version adds a section, your copy still has the old placeholders — and an answer with nowhere to render would be lost.

The CLI will not lose it silently. Whenever a command supplies a value the template has no placeholder for, it says so and names the file:

```text
Warning: 4 answer(s) were not written because the template has no placeholder for them.
  Dropped: options, tradeoffs, openQuestions, decisionToInform
  Template: .engineering/templates/research.md
  This custom template is missing sections the built-in one has. Add {{placeholder}} for each dropped field, or delete the file to use the built-in template.
```

Two ways out: add the missing `{{placeholders}}` to your copy, or delete the file to fall back to the built-in template. The artifact is still written either way — dropping a section you deliberately removed is a valid customization, so this is a warning and not an error.

The MCP create tools report the same thing as a `droppedFields` array in their result, so an assistant can pass it on instead of reporting success on a half-written artifact.

## Using it in CI

`eng check --json` is designed for pipelines:

```json
{
  "result": "passed",
  "checks": [
    {
      "id": "decision-document",
      "name": "Decision document",
      "status": "passed",
      "message": "1 decision document(s) found"
    }
  ]
}
```

```yaml
# .github/workflows/engineering.yml
name: engineering
on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: node packages/cli/dist/index.js check --json
```

A dedicated GitHub Action and PR comments are planned for v0.3.

## MCP server

> AI made code cheaper. Bad decisions are still expensive.

`@engineering-toolkit/mcp` exposes a workspace to AI assistants over the [Model Context Protocol](https://modelcontextprotocol.io), so an agent can read the engineering memory before writing the next line of code. It answers questions like *"before I implement this, which decisions should I consider?"* from real artifacts instead of chat history.

Point any MCP client at it:

```json
{
  "mcpServers": {
    "engineering-toolkit": {
      "command": "npx",
      "args": ["@engineering-toolkit/mcp", "--cwd", "."]
    }
  }
}
```

Before publishing, run it from a build: `node packages/mcp/dist/bin.js --cwd .`

`--cwd` is the workspace directory holding `.engineering/config.yml`. The server speaks over stdio and writes nothing to stdout except protocol traffic.

### Tools

| Tool | Reads/writes | Answers |
| --- | --- | --- |
| `engineering_workspace_summary` | read | What is the state of this project? Counts, accepted decisions, active plans, open risks, check result |
| `engineering_list_artifacts` | read | What has been recorded? Optionally filtered by `type` |
| `engineering_get_artifact` | read | What does artifact `id` actually say, in full |
| `engineering_run_checks` | read | What is still missing? Same report as `eng check --json` |
| `engineering_create_artifact` | write | Record any artifact type from template `data` |
| `engineering_create_decision` | write | Record a technical decision |
| `engineering_create_plan` | write | Record an implementation plan |

Read tools are annotated `readOnlyHint`. The write tools only ever add files — nothing in this package edits or deletes an artifact, and nothing touches application code.

The server ships MCP `instructions` telling the client to summarize the workspace first, cite the artifacts it used, and leave the decision to the user. The intended flow:

```text
1. engineering_workspace_summary   -> what is already decided
2. engineering_get_artifact        -> read the reasoning that matters
3. propose, question, point out gaps
4. engineering_create_plan         -> only once the user asks for it
5. engineering_run_checks          -> what the new plan still misses
```

### Notes

- **Tool names use underscores**, not the dots in the original design (`engineering.list_artifacts`). Claude and other clients require tool names to match `^[a-zA-Z0-9_-]{1,64}$`, and clients that prefix server tools would produce an invalid name from a dotted one. A test asserts every name matches that pattern.
- **Handlers are thin.** Every rule about what an artifact contains lives in `artifacts`, `templates` and `checks`, so the CLI and the MCP server cannot drift: `eng decide` and `engineering_create_decision` call the same function.
- **v0.1 is read-first.** No editing, no deleting, no code generation, no GitHub integration.

## Repository layout

```text
packages/
  cli/        Command-line interface (commander + inquirer)
  mcp/        Model Context Protocol server for AI assistants
  core/       Domain types and contracts, no I/O
  config/     Config loading and validation (zod)
  templates/  Built-in artifact templates
  artifacts/  Artifact creation, parsing, and listing
  checks/     The check engine and built-in checks
examples/
  demo-project/   A workspace you can run the CLI against
```

Try it against the example workspace:

```bash
pnpm build
node packages/cli/dist/index.js check --cwd examples/demo-project
node packages/cli/dist/index.js list  --cwd examples/demo-project
node packages/cli/dist/index.js show  decision-0001-use-monorepo-packages --cwd examples/demo-project
```

## Development

```bash
pnpm install
pnpm build      # tsup, every package
pnpm test       # vitest
pnpm clean
```

## Roadmap

| Version | Focus | State |
| --- | --- | --- |
| v0.1 | CLI foundation: `init`, `decide`, `plan`, `review`, `list`, `show`, `check` | done |
| v0.2 | Guided flow for every command, per-command interactive switch, custom templates, tests, `create` / `new` / `attach` | done |
| v0.2 | [MCP server](#mcp-server): read tools, artifact creation, checks, workspace summary | done |
| v0.3 | MCP: controlled artifact editing, filters by status/tag/owner, text search, artifact relationships | next |
| v0.3 | GitHub Action, PR comments, richer CLI output | next |
| v0.4 | Plugin system for external checks and integrations | planned |
| v0.5 | VS Code extension | planned |
| v0.6 | Web dashboard | planned |
| v0.7 | AI-assisted technical review | planned |
| v1.0 | Stable CLI, artifact model, config format, and check engine | planned |

Also on the list: public API change detection, artifact relationship graphs, and more configurable check behavior.

## What this project is not

Engineering Toolkit does not try to:

- generate application code
- replace architecture work
- replace code review
- enforce one methodology
- be a framework

Its job is to make decisions, plans, reviews, and standards visible and automatable.

## Contributing

Issues and pull requests are welcome. Run `pnpm test` before opening one. Substantial changes are a good excuse to use the tool on itself — attach an `eng decide` artifact to the pull request describing the trade-off you picked.

## License

MIT — see [LICENSE](./LICENSE).
