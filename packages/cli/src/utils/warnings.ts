import { relative } from "node:path";
import type { CreateArtifactResult } from "@engineering-toolkit/artifacts";

export const warnDroppedFields = (
  rootDir: string,
  result: CreateArtifactResult,
): CreateArtifactResult => {
  if (result.droppedFields.length === 0) {
    return result;
  }

  const fields = result.droppedFields.join(", ");

  console.warn(
    `Warning: ${result.droppedFields.length} answer(s) were not written because the template has no placeholder for them.`,
  );
  console.warn(`  Dropped: ${fields}`);

  if (result.customTemplatePath) {
    const templatePath = relative(rootDir, result.customTemplatePath);

    console.warn(`  Template: ${templatePath}`);
    console.warn(
      `  This custom template is missing sections the built-in one has. Add {{placeholder}} for each dropped field, or delete the file to use the built-in template.`,
    );
  }

  return result;
};
