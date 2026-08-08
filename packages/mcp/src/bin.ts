#!/usr/bin/env node
import { resolve } from "node:path";
import { runStdioServer, SERVER_VERSION } from "./index";

export interface CliArgs {
  rootDir: string;
  help: boolean;
  version: boolean;
}

const USAGE = `engineering-toolkit MCP server

Usage:
  eng-mcp [--cwd <path>]

Options:
  -C, --cwd <path>   Workspace directory holding .engineering/config.yml (default: current directory)
  -v, --version      Print the server version
  -h, --help         Show this message

Speaks the Model Context Protocol over stdio. Point an MCP client at it:

  {
    "mcpServers": {
      "engineering-toolkit": {
        "command": "npx",
        "args": ["@engineering-toolkit/mcp", "--cwd", "."]
      }
    }
  }
`;

export const parseArgs = (argv: string[]): CliArgs => {
  let rootDir = process.cwd();
  let help = false;
  let version = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? "";

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    if (arg === "--version" || arg === "-v") {
      version = true;
      continue;
    }

    if (arg === "--cwd" || arg === "-C") {
      const value = argv[index + 1];

      if (!value || value.startsWith("-")) {
        throw new Error("Missing value for --cwd");
      }

      rootDir = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--cwd=")) {
      const value = arg.slice("--cwd=".length);

      if (!value) {
        throw new Error("Missing value for --cwd");
      }

      rootDir = value;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return { rootDir: resolve(rootDir), help, version };
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stderr.write(USAGE);
    return;
  }

  if (args.version) {
    process.stderr.write(`${SERVER_VERSION}\n`);
    return;
  }

  await runStdioServer(args.rootDir);
  process.stderr.write(
    `engineering-toolkit MCP server ready (workspace: ${args.rootDir})\n`,
  );
};

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
