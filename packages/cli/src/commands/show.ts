import { getArtifactById } from "@engineering-toolkit/artifacts";
import { loadConfig } from "@engineering-toolkit/config";
import { relative } from "node:path";
import { readFileSync } from "node:fs";

export interface ShowOptions {
  rootDir: string;
  id: string;
  json?: boolean;
}

export const showCommand = (options: ShowOptions): number => {
  const config = loadConfig(options.rootDir);
  const artifact = getArtifactById(options.rootDir, config, options.id);

  if (!artifact) {
    console.error(`Artifact not found: ${options.id}`);
    return 1;
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          path: relative(options.rootDir, artifact.path),
          meta: artifact.meta,
          body: artifact.body,
        },
        null,
        2,
      ),
    );
    return 0;
  }

  const raw = readFileSync(artifact.path, "utf8");
  console.log(raw.trimEnd());
  return 0;
};
