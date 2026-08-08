import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { configToYaml, createDefaultConfig } from "@engineering-toolkit/config";
import { createEngineeringMcpServer, SERVER_NAME, TOOL_NAMES } from "./server";

const tempDirs: string[] = [];
const openClients: Client[] = [];

const createWorkspace = (): string => {
  const rootDir = mkdtempSync(join(tmpdir(), "eng-mcp-server-"));
  tempDirs.push(rootDir);
  mkdirSync(join(rootDir, ".engineering"), { recursive: true });
  writeFileSync(
    join(rootDir, ".engineering", "config.yml"),
    configToYaml(createDefaultConfig("br-financial-kit")),
    "utf8",
  );
  return rootDir;
};

const connect = async (rootDir: string): Promise<Client> => {
  const server = createEngineeringMcpServer({ rootDir });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1.0.0" });
  openClients.push(client);

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return client;
};

const payload = (result: unknown): any => {
  const content = (result as { content: Array<{ type: string; text: string }> })
    .content;
  const first = content[0];

  if (!first || first.type !== "text") {
    throw new Error("Tool did not answer with a text block");
  }

  return JSON.parse(first.text);
};

afterEach(async () => {
  while (openClients.length > 0) {
    await openClients.pop()?.close();
  }

  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("engineering MCP server", () => {
  it("advertises exactly the v0.1 tools, read tools first", async () => {
    const client = await connect(createWorkspace());

    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name)).toEqual([...TOOL_NAMES]);
  });

  it("uses client-safe tool names", async () => {
    const client = await connect(createWorkspace());

    const { tools } = await client.listTools();

    for (const tool of tools) {
      expect(tool.name).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
    }
  });

  it("marks read tools read-only and write tools non-destructive", async () => {
    const client = await connect(createWorkspace());

    const { tools } = await client.listTools();
    const byName = new Map(tools.map((tool) => [tool.name, tool]));

    expect(byName.get("engineering_workspace_summary")?.annotations).toMatchObject(
      { readOnlyHint: true },
    );
    expect(byName.get("engineering_list_artifacts")?.annotations).toMatchObject({
      readOnlyHint: true,
    });
    expect(byName.get("engineering_create_decision")?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    });
  });

  it("tells the client to read the memory before answering", async () => {
    const rootDir = createWorkspace();
    const server = createEngineeringMcpServer({ rootDir });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "1.0.0" });
    openClients.push(client);

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);

    expect(client.getServerVersion()?.name).toBe(SERVER_NAME);
    expect(client.getInstructions()).toContain("engineering_workspace_summary");
    expect(client.getInstructions()).toContain("You do not make the decisions");
  });

  it("runs the read-decide-check round trip over the protocol", async () => {
    const client = await connect(createWorkspace());

    const before = payload(
      await client.callTool({
        name: "engineering_workspace_summary",
        arguments: {},
      }),
    );
    expect(before.acceptedDecisions).toEqual([]);
    expect(before.checks.result).toBe("failed");

    const created = payload(
      await client.callTool({
        name: "engineering_create_decision",
        arguments: {
          title: "Adopt provider-based architecture",
          problem: "Financial integrations in Brazil require different APIs",
          alternatives: "Single SDK per bank; unified core with providers",
          decision: "Use provider contracts with independent provider packages",
          rollback: "Keep provider-specific behavior behind capabilities",
          owner: "ariel",
        },
      }),
    );
    expect(created.path).toBe(
      "docs/decisions/0001-adopt-provider-based-architecture.md",
    );

    const artifact = payload(
      await client.callTool({
        name: "engineering_get_artifact",
        arguments: { id: created.id },
      }),
    );
    expect(artifact.body).toContain("# Alternatives");

    const after = payload(
      await client.callTool({
        name: "engineering_workspace_summary",
        arguments: {},
      }),
    );
    expect(after.acceptedDecisions).toEqual([
      { id: created.id, title: "Adopt provider-based architecture" },
    ]);
    expect(after.checks.result).toBe("passed");
  });

  it("rejects a call that is missing a required argument", async () => {
    const client = await connect(createWorkspace());

    const result = await client.callTool({
      name: "engineering_create_decision",
      arguments: { title: "Only a title" },
    });

    expect(result.isError).toBe(true);
  });

  it("rejects an artifact type outside the enum", async () => {
    const client = await connect(createWorkspace());

    const result = await client.callTool({
      name: "engineering_list_artifacts",
      arguments: { type: "banana" },
    });

    expect(result.isError).toBe(true);
  });
});
