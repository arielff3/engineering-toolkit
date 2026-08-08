import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

/** Everything a tool needs to reach the workspace. */
export interface ToolContext {
  rootDir: string;
}

/** Annotations for a tool that only reads the workspace. */
export const readOnly = (title: string): ToolAnnotations => ({
  title,
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
});

/**
 * Annotations for a tool that writes a new artifact.
 *
 * Not destructive — these tools only add files, never overwrite or delete —
 * but not idempotent either: calling twice writes two artifacts.
 */
export const additive = (title: string): ToolAnnotations => ({
  title,
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
});
