import { loadConfig } from "@engineering-toolkit/config";
import { createCheckContext, runChecks } from "@engineering-toolkit/checks";

export interface CheckOptions {
  rootDir: string;
}

const statusIcon = (status: string): string => {
  if (status === "passed") {
    return "✓";
  }

  if (status === "warning") {
    return "⚠";
  }

  return "✗";
};

export const checkCommand = async (
  options: CheckOptions,
): Promise<number> => {
  const config = loadConfig(options.rootDir);
  const context = createCheckContext(options.rootDir, config);
  const { results, hasFailures } = await runChecks(context);

  console.log("Engineering Check\n");

  for (const { check, result } of results) {
    console.log(`${statusIcon(result.status)} ${check.name}`);
    console.log(`  ${result.message}`);

    if (result.suggestion) {
      console.log(`  → ${result.suggestion}`);
    }

    console.log("");
  }

  if (hasFailures) {
    console.log("Result: failed");
    return 1;
  }

  console.log("Result: passed");
  return 0;
};
