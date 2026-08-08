import { input, select } from "@inquirer/prompts";
import { createArtifact } from "@engineering-toolkit/artifacts";
import { loadConfig } from "@engineering-toolkit/config";
import type { ArtifactStatus, ArtifactType } from "@engineering-toolkit/core";
import { ARTIFACT_TYPE_TO_DOCUMENT_KEY } from "@engineering-toolkit/core";
import {
  resolveTemplateFields,
  type TemplateData,
  type TemplateName,
} from "@engineering-toolkit/templates";
import { parseStatus, requireFields, splitList, toArray } from "../utils/flags";
import { parseArtifactType } from "./list";
import { warnDroppedFields } from "../utils/warnings";

export interface CreateInput {
  type: ArtifactType;
  title: string;
  data?: TemplateData;
  owner?: string;
  tags?: string[];
  related?: string[];
  status?: ArtifactStatus;
}

export interface CreateFlags {
  type?: string;
  title?: string;
  owner?: string;
  tag?: string | string[];
  related?: string | string[];
  status?: string;
  data?: string | string[];
}

export interface CreateOptions extends CreateFlags {
  rootDir: string;
}

export interface CreateCommandOptions {
  rootDir: string;
  defaults?: CreateFlags;
}

const ARTIFACT_TYPES = Object.keys(
  ARTIFACT_TYPE_TO_DOCUMENT_KEY,
) as ArtifactType[];

export const parseTemplateData = (values?: string | string[]): TemplateData => {
  const data: TemplateData = {};

  for (const raw of toArray(values)) {
    const entry = raw.trim();

    if (!entry) {
      continue;
    }

    const separator = entry.indexOf("=");

    if (separator === -1) {
      throw new Error(`Invalid --data value "${entry}". Use key=value.`);
    }

    const key = entry.slice(0, separator).trim();
    const content = entry.slice(separator + 1).trim();

    if (!key) {
      throw new Error(`Invalid --data value "${entry}". Key is required.`);
    }

    data[key] = content;
  }

  return data;
};

export const createFromInput = (
  rootDir: string,
  inputData: CreateInput,
): string => {
  requireFields({ title: inputData.title }, ["title"]);

  const config = loadConfig(rootDir);
  const owner = inputData.owner?.trim() ?? "";

  const result = createArtifact({
    rootDir,
    config,
    type: inputData.type,
    title: inputData.title.trim(),
    owners: owner ? [owner] : [],
    tags: inputData.tags ?? [],
    relatedArtifacts: inputData.related ?? [],
    status: inputData.status ?? "draft",
    templateData: inputData.data ?? {},
  });

  return warnDroppedFields(rootDir, result).relativePath;
};

export const createFromFlags = (options: CreateOptions): string => {
  const type = parseArtifactType(options.type);

  if (!type) {
    throw new Error(
      `Artifact type is required. Expected one of: ${ARTIFACT_TYPES.join(", ")}`,
    );
  }

  return createFromInput(options.rootDir, {
    type,
    title: options.title ?? "",
    data: parseTemplateData(options.data),
    owner: options.owner,
    tags: splitList(options.tag),
    related: splitList(options.related),
    status: parseStatus(
      options.status,
      ["draft", "proposed", "accepted", "deprecated", "superseded"],
      "draft",
    ),
  });
};

export const createCommand = async (
  options: CreateCommandOptions,
): Promise<string> => {
  const defaults = options.defaults ?? {};

  const type =
    parseArtifactType(defaults.type) ??
    (await select<ArtifactType>({
      message: "Artifact type",
      choices: ARTIFACT_TYPES.map((value) => ({ name: value, value })),
    }));

  const title = await input({
    message: "Title",
    default: defaults.title ?? "",
    validate: (value) => (value.trim() ? true : "Please provide a title"),
  });

  const provided = parseTemplateData(defaults.data);
  const fields = resolveTemplateFields(type as TemplateName, {
    rootDir: options.rootDir,
  });

  const data: TemplateData = { ...provided };

  for (const field of fields) {
    data[field.name] = await input({
      message: field.label,
      default: provided[field.name] ?? "",
    });
  }

  const owner = await input({
    message: "Owner (optional)",
    default: defaults.owner ?? "",
  });

  const tags = await input({
    message: "Tags (comma-separated, optional)",
    default: splitList(defaults.tag).join(", "),
  });

  const related = await input({
    message: "Related artifact ids (comma-separated, optional)",
    default: splitList(defaults.related).join(", "),
  });

  return createFromInput(options.rootDir, {
    type,
    title,
    data,
    owner,
    tags: splitList(tags),
    related: splitList(related),
    status: parseStatus(
      defaults.status,
      ["draft", "proposed", "accepted", "deprecated", "superseded"],
      "draft",
    ),
  });
};
