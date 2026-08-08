import { defineConfig } from "tsup";
import pkg from "./package.json";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  noExternal: [/^@engineering-toolkit\//],
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  banner: {
    js: "#!/usr/bin/env node",
  },
  shims: true,
});
