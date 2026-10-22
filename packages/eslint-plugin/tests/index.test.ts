import { describe, it, expect } from "vitest";
import { rules, configs } from "../src/index";

describe("index exports", () => {
  it("exports all rules", () => {
    expect(Object.keys(rules).sort()).toEqual([
      "react",
      "server",
    ]);
  });

  it("recommended config includes all rules", () => {
    const recommendedRules = Object.keys(configs.recommended.rules);
    const allRules = Object.keys(rules).map((rule) => `@luma-layered-ts/${rule}`);
    expect(recommendedRules.sort()).toEqual(allRules.sort());
  });
});
