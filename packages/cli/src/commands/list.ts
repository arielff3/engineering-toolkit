import type { ArtifactType } from "@engineering-toolkit/core";
import { listArtifacts } from "@engineering-toolkit/artifacts";
import { loadConfig } from "@engineering-toolkit/config";
import { relative } from "node:path";

export interface ListOptions {
  rootDir: string;
  type?: ArtifactType;
}

const artifactTypes = [
  "vision",
  "roadmap",
  "research",
  "brief",
  "decision",
  "plan",
  "review",
  "risk",
  "runbook",
] as const;

export const parseArtifactType = (value?: string): ArtifactType | undefined => {
  if (!value) {
    return undefined;
  }

  if (artifactTypes.includes(value as ArtifactType)) {
    return value as ArtifactType;
  }

  throw new Error(
    `Invalid artifact type "${value}". Expected one of: ${artifactTypes.join(", ")}`,
  );
};

const formatOwners = (owners: string[]): string =>
  owners.length > 0 ? owners.join(", ") : "-";

export const listCommand = (options: ListOptions): number => {
  const config = loadConfig(options.rootDir);
  const artifacts = listArtifacts(options.rootDir, config, options.type);

  if (artifacts.length === 0) {
    const scope = options.type ? ` ${options.type}` : "";
    console.log(`No${scope} artifacts found.`);
    return 0;
  }

  for (const artifact of artifacts) {
    console.log(`${artifact.meta.id}`);
    console.log(`  Type: ${artifact.meta.type}`);
    console.log(`  Title: ${artifact.meta.title}`);
    console.log(`  Status: ${artifact.meta.status}`);
    console.log(`  Owners: ${formatOwners(artifact.meta.owners)}`);
    console.log(`  Path: ${relative(options.rootDir, artifact.path)}`);
    console.log("");
  }

  return 0;
};
