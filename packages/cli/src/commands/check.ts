import { loadConfig } from "@engineering-toolkit/config";
import {
  createCheckContext,
  runChecks,
  toCheckReport,
  type CheckReport,
} from "@engineering-toolkit/checks";

export interface CheckOptions {
  rootDir: string;
  json?: boolean;
}

export type CheckJsonReport = CheckReport;

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
  const run = await runChecks(context);
  const { results, hasFailures } = run;

  if (options.json) {
    console.log(JSON.stringify(toCheckReport(run), null, 2));
    return hasFailures ? 1 : 0;
  }

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
