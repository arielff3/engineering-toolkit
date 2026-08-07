import type {
  ArtifactStatus,
  EngineeringConfig,
  InteractiveCommand,
} from "@engineering-toolkit/core";

export const requireFields = (
  fields: Record<string, string | undefined>,
  required: string[],
): void => {
  const missing = required.filter((key) => !fields[key]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Missing required options: ${missing.map((key) => `--${key}`).join(", ")}`,
    );
  }
};

export const parseStatus = (
  value: string | undefined,
  allowed: ArtifactStatus[],
  fallback: ArtifactStatus,
): ArtifactStatus => {
  if (!value) {
    return fallback;
  }

  if (allowed.includes(value as ArtifactStatus)) {
    return value as ArtifactStatus;
  }

  throw new Error(
    `Invalid status "${value}". Expected one of: ${allowed.join(", ")}`,
  );
};

export const splitList = (value?: string | string[]): string[] => {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];

  return values
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
};

export const toArray = (value?: string | string[]): string[] => {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

export interface InteractivityFlags {
  yes?: boolean;
  nonInteractive?: boolean;
  interactive?: boolean;
}

export const isTtySession = (): boolean => {
  if (process.env.ENG_NON_INTERACTIVE === "1") {
    return false;
  }

  if (process.env.CI && process.env.CI !== "false") {
    return false;
  }

  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
};

const hasValue = (value: unknown): boolean =>
  typeof value === "string" && value.trim() !== "";

export interface InteractivityInput {
  options: InteractivityFlags & Record<string, unknown>;
  command?: InteractiveCommand;
  config?: EngineeringConfig;
  requiredFlags?: string[];
}

export const isNonInteractive = (input: InteractivityInput): boolean => {
  const { options, command, config, requiredFlags = [] } = input;

  if (options.yes === true || options.nonInteractive === true) {
    return true;
  }

  const tty = isTtySession();

  if (options.interactive === true) {
    return !tty;
  }

  if (command && config?.interactive?.[command] === false) {
    return true;
  }

  if (!tty) {
    return true;
  }

  if (requiredFlags.length === 0) {
    return false;
  }

  return requiredFlags.every((flag) => hasValue(options[flag]));
};

export const describeNonInteractiveReason = (
  input: InteractivityInput,
): string => {
  const { options, command, config } = input;

  if (options.yes === true || options.nonInteractive === true) {
    return "--yes was passed";
  }

  if (command && config?.interactive?.[command] === false) {
    return `interactive.${command} is false in .engineering/config.yml`;
  }

  if (!isTtySession()) {
    return "no interactive terminal is available";
  }

  return "every required flag was already provided";
};
