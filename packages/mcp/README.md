# @engineering-toolkit/mcp

> AI made code cheaper. Bad decisions are still expensive.

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes an [Engineering Toolkit](https://github.com/arielff3/engineering-toolkit) workspace to AI assistants, so an agent can read the engineering memory of a project — the decisions, plans, research and risks the team actually recorded — before writing the next line of code.

It answers *"before I implement this, which decisions should I consider?"* from real artifacts instead of chat history.

## Setup

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

`--cwd` is the workspace directory holding `.engineering/config.yml`. Create one with [`@engineering-toolkit/cli`](https://www.npmjs.com/package/@engineering-toolkit/cli):

```bash
npx @engineering-toolkit/cli init
```

The server speaks over stdio and writes nothing to stdout except protocol traffic.

## Tools

| Tool | Reads/writes | Answers |
| --- | --- | --- |
| `engineering_workspace_summary` | read | What is the state of this project? Counts, accepted decisions, active plans, open risks, check result |
| `engineering_list_artifacts` | read | What has been recorded? Optionally filtered by type |
| `engineering_get_artifact` | read | What does artifact `id` actually say, in full |
| `engineering_run_checks` | read | What is still missing? |
| `engineering_create_artifact` | write | Record any artifact type |
| `engineering_create_decision` | write | Record a technical decision |
| `engineering_create_plan` | write | Record an implementation plan |

Read tools are annotated `readOnlyHint`. Write tools are annotated as non-destructive but non-idempotent — they only add files, never overwrite or delete, but calling twice writes two artifacts.

## The assistant does not decide

The server ships instructions telling the model to read the accepted decisions before proposing anything, to say which artifacts it used, and to write an artifact only once the user has actually chosen. Suggest, question, summarize and point out gaps — then let the human decide.

## Programmatic use

```ts
import { createEngineeringMcpServer } from "@engineering-toolkit/mcp";

const server = createEngineeringMcpServer({ rootDir: process.cwd() });
await server.connect(transport);
```

## Documentation

**https://github.com/arielff3/engineering-toolkit**

## License

MIT
