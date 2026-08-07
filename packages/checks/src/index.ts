import type {
  CheckContext,
  CheckRequirement,
  CheckResult,
  CheckStatus,
  EngineeringCheck,
  EngineeringArtifactFile,
} from "@engineering-toolkit/core";
import { listArtifacts } from "@engineering-toolkit/artifacts";
import type { EngineeringConfig } from "@engineering-toolkit/core";

export interface RunChecksResult {
  results: Array<{ check: EngineeringCheck; result: CheckResult }>;
  hasFailures: boolean;
  hasWarnings: boolean;
}

const sectionHasContent = (body: string, headings: string[]): boolean => {
  for (const heading of headings) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `^#+\\s*${escaped}\\s*\\r?\\n([\\s\\S]*?)(?=^#+\\s|$)`,
      "im",
    );
    const match = pattern.exec(body);

    if (!match) {
      continue;
    }

    const content = (match[1] ?? "").trim();

    if (content && content !== "_TBD_" && content.toLowerCase() !== "tbd") {
      return true;
    }
  }

  return false;
};

const resolveStatus = (
  requirement: CheckRequirement,
  ok: boolean,
): CheckStatus => {
  if (ok) {
    return "passed";
  }

  if (requirement === "required") {
    return "failed";
  }

  if (requirement === "optional") {
    return "warning";
  }

  return "passed";
};

const filterByTypes = (
  artifacts: EngineeringArtifactFile[],
  types: EngineeringArtifactFile["meta"]["type"][],
): EngineeringArtifactFile[] =>
  artifacts.filter((artifact) => types.includes(artifact.meta.type));

export const decisionDocumentCheck: EngineeringCheck = {
  id: "decision-document",
  name: "Decision document",
  description: "Checks that at least one decision document exists",
  run: async (context) => {
    const requirement = context.config.checks.decisionDocument;

    if (requirement === "disabled") {
      return {
        status: "passed",
        message: "Decision check disabled",
      };
    }

    const decisions = filterByTypes(context.artifacts, ["decision"]);
    const ok = decisions.length > 0;

    return {
      status: resolveStatus(requirement, ok),
      message: ok
        ? `${decisions.length} decision document(s) found`
        : "No decision documents found",
      suggestion: ok
        ? undefined
        : 'Run "eng decide" to register a technical decision',
    };
  },
};

export const ownerCheck: EngineeringCheck = {
  id: "owner",
  name: "Owner",
  description: "Checks that artifacts have owners",
  run: async (context) => {
    const requirement = context.config.checks.owner;

    if (requirement === "disabled") {
      return {
        status: "passed",
        message: "Owner check disabled",
      };
    }

    if (context.artifacts.length === 0) {
      return {
        status: resolveStatus(requirement, false),
        message: "No artifacts to validate owners",
        suggestion: 'Create an artifact with "eng decide", "eng plan" or "eng review"',
      };
    }

    const missing = context.artifacts.filter(
      (artifact) => artifact.meta.owners.length === 0,
    );
    const ok = missing.length === 0;

    return {
      status: resolveStatus(requirement, ok),
      message: ok
        ? "All artifacts have owners"
        : `${missing.length} artifact(s) missing owner`,
      suggestion: ok
        ? undefined
        : "Add owners in the frontmatter of each artifact",
    };
  },
};

export const rollbackCheck: EngineeringCheck = {
  id: "rollback",
  name: "Rollback",
  description: "Checks rollback sections in decisions and plans",
  run: async (context) => {
    const requirement = context.config.checks.rollback;

    if (requirement === "disabled") {
      return {
        status: "passed",
        message: "Rollback check disabled",
      };
    }

    const targets = filterByTypes(context.artifacts, ["decision", "plan"]);

    if (targets.length === 0) {
      return {
        status: "warning",
        message: "No decisions/plans to validate rollback",
        suggestion: 'Create a decision or plan with "eng decide" / "eng plan"',
      };
    }

    const missing = targets.filter(
      (artifact) => !sectionHasContent(artifact.body, ["Rollback"]),
    );
    const ok = missing.length === 0;

    return {
      status: resolveStatus(requirement, ok),
      message: ok
        ? "Rollback documented in decisions/plans"
        : `Rollback missing in ${missing.length} artifact(s)`,
      suggestion: ok
        ? undefined
        : "Add a filled # Rollback section to decisions and plans",
    };
  },
};

export const testingCheck: EngineeringCheck = {
  id: "testing",
  name: "Test strategy",
  description: "Checks testing sections in plans",
  run: async (context) => {
    const requirement = context.config.checks.testing;

    if (requirement === "disabled") {
      return {
        status: "passed",
        message: "Testing check disabled",
      };
    }

    const plans = filterByTypes(context.artifacts, ["plan"]);

    if (plans.length === 0) {
      return {
        status: "warning",
        message: "No plans to validate testing strategy",
        suggestion: 'Create a plan with "eng plan"',
      };
    }

    const missing = plans.filter(
      (artifact) =>
        !sectionHasContent(artifact.body, ["Testing", "Test strategy", "Tests"]),
    );
    const ok = missing.length === 0;

    return {
      status: resolveStatus(requirement, ok),
      message: ok
        ? "Test strategy documented in plans"
        : `Testing missing in ${missing.length} plan(s)`,
      suggestion: ok
        ? undefined
        : "Add a filled # Testing section to each plan",
    };
  },
};

export const observabilityCheck: EngineeringCheck = {
  id: "observability",
  name: "Observability",
  description: "Checks monitoring sections in plans",
  run: async (context) => {
    const requirement = context.config.checks.observability;

    if (requirement === "disabled") {
      return {
        status: "passed",
        message: "Observability check disabled",
      };
    }

    const plans = filterByTypes(context.artifacts, ["plan"]);

    if (plans.length === 0) {
      return {
        status: "warning",
        message: "No plans to validate observability",
        suggestion: 'Create a plan with "eng plan"',
      };
    }

    const missing = plans.filter(
      (artifact) =>
        !sectionHasContent(artifact.body, ["Monitoring", "Observability"]),
    );
    const ok = missing.length === 0;

    return {
      status: resolveStatus(requirement, ok),
      message: ok
        ? "Observability documented in plans"
        : `Observability missing in ${missing.length} plan(s)`,
      suggestion: ok
        ? undefined
        : "Add a filled # Monitoring section to each plan",
    };
  },
};

export const builtInChecks: EngineeringCheck[] = [
  decisionDocumentCheck,
  testingCheck,
  rollbackCheck,
  observabilityCheck,
  ownerCheck,
];

export const createCheckContext = (
  rootDir: string,
  config: EngineeringConfig,
): CheckContext => ({
  rootDir,
  config,
  artifacts: listArtifacts(rootDir, config),
});

export const runChecks = async (
  context: CheckContext,
  checks: EngineeringCheck[] = builtInChecks,
): Promise<RunChecksResult> => {
  const results: RunChecksResult["results"] = [];

  for (const check of checks) {
    const result = await check.run(context);
    results.push({ check, result });
  }

  return {
    results,
    hasFailures: results.some(({ result }) => result.status === "failed"),
    hasWarnings: results.some(({ result }) => result.status === "warning"),
  };
};

export { sectionHasContent };
