import { describe, expect, it } from "vitest";
import { parseTemplateData } from "./create";

describe("parseTemplateData", () => {
  it("keeps commas inside a value", () => {
    expect(
      parseTemplateData(["vision=Decisions as code, versioned with the repo"]),
    ).toEqual({
      vision: "Decisions as code, versioned with the repo",
    });
  });

  it("keeps additional equals signs inside a value", () => {
    expect(parseTemplateData(["query=a=b"])).toEqual({ query: "a=b" });
  });

  it("collects one entry per occurrence", () => {
    expect(parseTemplateData(["now=CLI", "next=GitHub integration"])).toEqual({
      now: "CLI",
      next: "GitHub integration",
    });
  });

  it("accepts a single string value", () => {
    expect(parseTemplateData("goal=Ship v0.2")).toEqual({
      goal: "Ship v0.2",
    });
  });

  it("returns an empty object when nothing is passed", () => {
    expect(parseTemplateData()).toEqual({});
    expect(parseTemplateData([])).toEqual({});
  });

  it("rejects entries without a separator", () => {
    expect(() => parseTemplateData(["vision"])).toThrow(/Use key=value/);
  });

  it("rejects entries without a key", () => {
    expect(() => parseTemplateData(["=value"])).toThrow(/Key is required/);
  });
});
