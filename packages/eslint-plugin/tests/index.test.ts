import { describe, it, expect } from "vitest";
import { rules, configs } from "../src/index";

describe("index exports", () => {
  it("exports all rules", () => {
    expect(Object.keys(rules).sort()).toEqual([
      "next",
      "react",
      "require-layer",
      "server",
    ]);
  });

  it("recommended config includes base rules", () => {
    const recommendedRules = Object.keys(configs.recommended.rules).sort();
    expect(recommendedRules).toEqual([
      "@luma-layered-ts/react",
      "@luma-layered-ts/require-layer",
      "@luma-layered-ts/server",
    ]);
  });

  it("recommended-next config includes next rule", () => {
    const nextRules = Object.keys(configs["recommended-next"].rules).sort();
    expect(nextRules).toEqual([
      "@luma-layered-ts/next",
      "@luma-layered-ts/react",
      "@luma-layered-ts/require-layer",
      "@luma-layered-ts/server",
    ]);
  });
});
