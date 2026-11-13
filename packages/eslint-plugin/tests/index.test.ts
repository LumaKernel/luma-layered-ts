import { describe, it, expect } from "vitest";
import { TSESLint } from "@typescript-eslint/utils";
import tsParser from "@typescript-eslint/parser";
import { rules, configs } from "../src/index";

describe("index exports", () => {
  it("exports all rules", () => {
    expect(Object.keys(rules).sort()).toEqual([
      "codec-placement",
      "next",
      "react",
      "require-layer",
      "require-unsafe-dir",
      "server",
      "strict-collection",
    ]);
  });

  it("recommended config includes base rules", () => {
    const recommendedRules = Object.keys(configs.recommended.rules).sort();
    expect(recommendedRules).toEqual([
      "@luma-layered-ts/codec-placement",
      "@luma-layered-ts/react",
      "@luma-layered-ts/require-layer",
      "@luma-layered-ts/require-unsafe-dir",
      "@luma-layered-ts/server",
      "@luma-layered-ts/strict-collection",
    ]);
  });

  it("recommended-next config includes next rule", () => {
    const nextRules = Object.keys(configs["recommended-next"].rules).sort();
    expect(nextRules).toEqual([
      "@luma-layered-ts/codec-placement",
      "@luma-layered-ts/next",
      "@luma-layered-ts/react",
      "@luma-layered-ts/require-layer",
      "@luma-layered-ts/require-unsafe-dir",
      "@luma-layered-ts/server",
      "@luma-layered-ts/strict-collection",
    ]);
  });
});

describe("server-only in infra", () => {
  const linter = new TSESLint.Linter({ cwd: "/project", configType: "flat" });
  function lint(configName: "recommended" | "recommended-next") {
    return linter
      .verify(
        `import { Pool } from "pg";\n`,
        [
          { files: ["**/*.ts"], languageOptions: { parser: tsParser } },
          configs[configName],
        ] satisfies TSESLint.FlatConfig.ConfigArray,
        "/project/src/infra/db.ts",
      )
      .map((m) => `${m.line} ${m.ruleId ?? "-"}: ${m.messageId ?? "-"}`);
  }

  it("is required by recommended-next", () => {
    expect(lint("recommended-next")).toMatchInlineSnapshot(`
      [
        "1 @luma-layered-ts/server: requireServerOnly",
      ]
    `);
  });

  it("is not required by recommended (server-only throws outside Next.js)", () => {
    expect(lint("recommended")).toMatchInlineSnapshot(`[]`);
  });
});

describe("unsafe-dir config", () => {
  const linter = new TSESLint.Linter({ cwd: "/project", configType: "flat" });
  const config = [
    { files: ["**/*.ts"], languageOptions: { parser: tsParser } },
    configs.recommended,
    configs["unsafe-dir"],
    { rules: { "no-console": "error" } },
  ] satisfies TSESLint.FlatConfig.ConfigArray;

  function lint(code: string, filename: string) {
    return linter
      .verify(code, config, filename)
      .map((m) => `${m.severity} ${m.ruleId ?? "-"}: ${m.message}`);
  }

  it("eslint-disable outside _unsafe_/ suppresses nothing, including require-unsafe-dir itself", () => {
    expect(
      lint(
        "/* eslint-disable */\nconsole.log(1);\n",
        "/project/src/core/foo.ts",
      ),
    ).toMatchInlineSnapshot(`
      [
        "1 -: '/* eslint-disable */' has no effect because you have 'noInlineConfig' setting in your config.",
        "2 @luma-layered-ts/require-unsafe-dir: 'eslint-disable' suppresses checks. Move the code that needs it into a _unsafe_/ directory.",
        "2 no-console: Unexpected console statement.",
      ]
    `);
  });

  it("eslint-disable inside _unsafe_/ works", () => {
    expect(
      lint(
        "// eslint-disable-next-line no-console\nconsole.log(1);\n",
        "/project/src/core/_unsafe_/foo.ts",
      ),
    ).toMatchInlineSnapshot(`[]`);
  });

  it("unused eslint-disable inside _unsafe_/ is an error", () => {
    expect(
      lint(
        "// eslint-disable-next-line no-console\nconst x = 1;\n",
        "/project/src/core/_unsafe_/foo.ts",
      ),
    ).toMatchInlineSnapshot(`
      [
        "2 -: Unused eslint-disable directive (no problems were reported from 'no-console').",
      ]
    `);
  });
});
