import { loadConfig } from "@engineering-toolkit/config";
import {
  createCheckContext,
  runChecks,
  toCheckReport,
  type CheckReport,
} from "@engineering-toolkit/checks";

export const runChecksInput = {};

export type { CheckReport };

/**
 * Runs the workspace checks and returns the same report `eng check --json`
 * prints. Shared by the run_checks tool and the workspace summary.
 */
export const runWorkspaceChecks = async (
  rootDir: string,
): Promise<CheckReport> => {
  const config = loadConfig(rootDir);
  const context = createCheckContext(rootDir, config);

  return toCheckReport(await runChecks(context));
};
