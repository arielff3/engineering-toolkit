import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

const { version } = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8"),
) as { version: string };

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(version),
  },
  test: {
    include: ["packages/**/src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@engineering-toolkit/core": path.join(
        root,
        "packages/core/src/index.ts",
      ),
      "@engineering-toolkit/config": path.join(
        root,
        "packages/config/src/index.ts",
      ),
      "@engineering-toolkit/templates": path.join(
        root,
        "packages/templates/src/index.ts",
      ),
      "@engineering-toolkit/artifacts": path.join(
        root,
        "packages/artifacts/src/index.ts",
      ),
      "@engineering-toolkit/checks": path.join(
        root,
        "packages/checks/src/index.ts",
      ),
      "@engineering-toolkit/mcp": path.join(root, "packages/mcp/src/index.ts"),
    },
  },
});
