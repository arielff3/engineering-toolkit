import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { configToYaml, createDefaultConfig, parseConfig } from "./index";

describe("configToYaml", () => {
  it("quotes values that would otherwise break YAML", () => {
    const config = createDefaultConfig("acme: infra #1");
    const yaml = configToYaml(config);
    const parsed = parseYaml(yaml);

    expect(parsed.project.name).toBe("acme: infra #1");
    expect(parsed.workspace.name).toBe("acme: infra #1");
  });

  it("round-trips through parseConfig", () => {
    const config = createDefaultConfig("demo");
    const roundTripped = parseConfig(parseYaml(configToYaml(config)));

    expect(roundTripped).toEqual(config);
  });

  it("omits attachedRepository when it is not set", () => {
    const yaml = configToYaml(createDefaultConfig("demo"));

    expect(yaml).not.toContain("attachedRepository");
  });

  it("keeps keys the schema does not know about", () => {
    const config = parseConfig({
      version: 1,
      project: { name: "demo" },
      plugins: { github: { enabled: true } },
    });

    const parsed = parseYaml(configToYaml(config));

    expect(parsed.plugins).toEqual({ github: { enabled: true } });
  });

  it("separates top-level sections with a blank line", () => {
    const yaml = configToYaml(createDefaultConfig("demo"));

    expect(yaml).toContain("\n\nworkspace:");
    expect(yaml).toContain("\n\nchecks:");
  });
});
