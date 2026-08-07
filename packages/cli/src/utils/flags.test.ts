import { afterEach, describe, expect, it } from "vitest";
import { createDefaultConfig } from "@engineering-toolkit/config";
import type { EngineeringConfig } from "@engineering-toolkit/core";
import {
  describeNonInteractiveReason,
  isNonInteractive,
  splitList,
  toArray,
} from "./flags";

const REQUIRED = ["title", "problem"];

const config = (): EngineeringConfig => createDefaultConfig("test");

const configWith = (
  overrides: Partial<EngineeringConfig["interactive"]>,
): EngineeringConfig => {
  const base = config();
  return { ...base, interactive: { ...base.interactive, ...overrides } };
};

const originalStdin = process.stdin.isTTY;
const originalStdout = process.stdout.isTTY;
const originalCi = process.env.CI;
const originalForced = process.env.ENG_NON_INTERACTIVE;

const setTty = (value: boolean): void => {
  Object.defineProperty(process.stdin, "isTTY", { value, configurable: true });
  Object.defineProperty(process.stdout, "isTTY", { value, configurable: true });
  delete process.env.CI;
  delete process.env.ENG_NON_INTERACTIVE;
};

afterEach(() => {
  Object.defineProperty(process.stdin, "isTTY", {
    value: originalStdin,
    configurable: true,
  });
  Object.defineProperty(process.stdout, "isTTY", {
    value: originalStdout,
    configurable: true,
  });

  if (originalCi === undefined) {
    delete process.env.CI;
  } else {
    process.env.CI = originalCi;
  }

  if (originalForced === undefined) {
    delete process.env.ENG_NON_INTERACTIVE;
  } else {
    process.env.ENG_NON_INTERACTIVE = originalForced;
  }
});

describe("isNonInteractive — flags", () => {
  it("honours --yes even with no other flag", () => {
    setTty(true);
    expect(
      isNonInteractive({ options: { yes: true }, requiredFlags: REQUIRED }),
    ).toBe(true);
  });

  it("honours --non-interactive", () => {
    setTty(true);
    expect(
      isNonInteractive({
        options: { nonInteractive: true },
        requiredFlags: REQUIRED,
      }),
    ).toBe(true);
  });

  it("prompts when required flags are incomplete", () => {
    setTty(true);
    expect(
      isNonInteractive({
        options: { title: "Only a title" },
        requiredFlags: REQUIRED,
      }),
    ).toBe(false);
  });

  it("skips prompts when every required flag is present", () => {
    setTty(true);
    expect(
      isNonInteractive({
        options: { title: "A title", problem: "A problem" },
        requiredFlags: REQUIRED,
      }),
    ).toBe(true);
  });

  it("ignores blank flag values", () => {
    setTty(true);
    expect(
      isNonInteractive({
        options: { title: "A title", problem: "  " },
        requiredFlags: REQUIRED,
      }),
    ).toBe(false);
  });

  it("stays interactive when no required flags are declared", () => {
    setTty(true);
    expect(isNonInteractive({ options: {} })).toBe(false);
  });
});

describe("isNonInteractive — environment", () => {
  it("never prompts without a terminal", () => {
    setTty(false);
    expect(isNonInteractive({ options: {}, requiredFlags: REQUIRED })).toBe(
      true,
    );
  });

  it("never prompts on CI", () => {
    setTty(true);
    process.env.CI = "true";
    expect(isNonInteractive({ options: {}, requiredFlags: REQUIRED })).toBe(
      true,
    );
  });

  it("never prompts when ENG_NON_INTERACTIVE is set", () => {
    setTty(true);
    process.env.ENG_NON_INTERACTIVE = "1";
    expect(isNonInteractive({ options: {}, requiredFlags: REQUIRED })).toBe(
      true,
    );
  });
});

describe("isNonInteractive — config", () => {
  it("defaults every command to interactive", () => {
    setTty(true);
    expect(
      isNonInteractive({ options: {}, config: config(), command: "decide" }),
    ).toBe(false);
  });

  it("respects interactive.<command> = false", () => {
    setTty(true);
    expect(
      isNonInteractive({
        options: {},
        config: configWith({ decide: false }),
        command: "decide",
      }),
    ).toBe(true);
  });

  it("only disables the command it names", () => {
    setTty(true);
    const disabled = configWith({ decide: false });

    expect(
      isNonInteractive({ options: {}, config: disabled, command: "decide" }),
    ).toBe(true);
    expect(
      isNonInteractive({ options: {}, config: disabled, command: "plan" }),
    ).toBe(false);
  });

  it("lets --interactive override a disabled command", () => {
    setTty(true);
    expect(
      isNonInteractive({
        options: { interactive: true },
        config: configWith({ create: false }),
        command: "create",
      }),
    ).toBe(false);
  });

  it("lets --interactive force prompts even with every required flag set", () => {
    setTty(true);
    expect(
      isNonInteractive({
        options: { interactive: true, title: "A title", problem: "A problem" },
        requiredFlags: REQUIRED,
      }),
    ).toBe(false);
  });

  it("does not let --interactive conjure a terminal", () => {
    setTty(false);
    expect(
      isNonInteractive({ options: { interactive: true }, command: "decide" }),
    ).toBe(true);
  });

  it("lets --yes win over --interactive", () => {
    setTty(true);
    expect(
      isNonInteractive({ options: { yes: true, interactive: true } }),
    ).toBe(true);
  });
});

describe("describeNonInteractiveReason", () => {
  it("names the flag", () => {
    setTty(true);
    expect(describeNonInteractiveReason({ options: { yes: true } })).toBe(
      "--yes was passed",
    );
  });

  it("names the config switch", () => {
    setTty(true);
    expect(
      describeNonInteractiveReason({
        options: {},
        config: configWith({ plan: false }),
        command: "plan",
      }),
    ).toBe("interactive.plan is false in .engineering/config.yml");
  });

  it("names the missing terminal", () => {
    setTty(false);
    expect(describeNonInteractiveReason({ options: {} })).toBe(
      "no interactive terminal is available",
    );
  });
});

describe("list helpers", () => {
  it("splitList splits on commas and trims", () => {
    expect(splitList("a, b ,c")).toEqual(["a", "b", "c"]);
    expect(splitList(["a,b", "c"])).toEqual(["a", "b", "c"]);
    expect(splitList()).toEqual([]);
  });

  it("toArray keeps values verbatim", () => {
    expect(toArray("a,b")).toEqual(["a,b"]);
    expect(toArray(["a,b", "c"])).toEqual(["a,b", "c"]);
    expect(toArray()).toEqual([]);
  });
});
