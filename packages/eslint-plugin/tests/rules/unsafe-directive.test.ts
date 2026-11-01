import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../src/rules/unsafe-directive";

const ruleTester = new RuleTester({
  // Unscoped eslint-disable would suppress this rule itself; that case is covered with
  // noInlineConfig in tests/index.test.ts. Here eslint directives name another rule.
  linterOptions: { reportUnusedDisableDirectives: "off" },
  languageOptions: {
    parser: require("@typescript-eslint/parser"),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
  },
});

const outside = "/project/src/core/foo.ts";

function invalid(code: string, directive: string, filename = outside) {
  return {
    code,
    filename,
    errors: [{ messageId: "outsideUnsafeDir" as const, data: { directive } }],
  };
}

ruleTester.run("unsafe-directive", rule, {
  valid: [
    // Inside _unsafe_/: any directive allowed
    {
      code: `// eslint-disable-next-line no-console\nconsole.log(1);`,
      filename: "/project/src/core/_unsafe_/foo.ts",
    },
    {
      code: `// @ts-expect-error\nconst x: number = "a";\n/* v8 ignore next */\nf();`,
      filename: "/project/src/infra/kv/_unsafe_/client.ts",
    },
    {
      code: `/* eslint-disable */`,
      filename: "/project/scripts/_unsafe_/gen.ts",
    },
    // Not directives
    { code: `// eslint is a linter\nconst x = 1;`, filename: outside },
    { code: `// see @ts-ignore usage in docs\nconst x = 1;`, filename: outside },
    { code: `// eslint-enable\nconst x = 1;`, filename: outside },
    { code: `// v8 ignored this\nconst x = 1;`, filename: outside },
    { code: `/* prettier-ignore */\nconst x = 1;`, filename: outside },
    // Directory name must match exactly
    { code: `const x = 1;`, filename: "/project/src/core/unsafe/foo.ts" },
  ],
  invalid: [
    // ESLint
    invalid(`/* eslint-disable no-console */`, "eslint-disable"),
    invalid(`// eslint-disable-next-line no-console`, "eslint-disable-next-line"),
    invalid(`f(); // eslint-disable-line no-console`, "eslint-disable-line"),
    invalid(`/* eslint no-console: off */`, "eslint"),
    // TypeScript
    invalid(`// @ts-ignore`, "@ts-ignore"),
    invalid(`// @ts-expect-error`, "@ts-expect-error"),
    invalid(`// @ts-nocheck`, "@ts-nocheck"),
    invalid(`/// @ts-ignore`, "@ts-ignore"),
    invalid(`/** @ts-ignore */`, "@ts-ignore"),
    // Coverage
    invalid(`/* istanbul ignore next */`, "istanbul ignore"),
    invalid(`/* c8 ignore next */`, "c8 ignore"),
    invalid(`/* v8 ignore next -- @preserve */`, "v8 ignore"),
    invalid(`// node:coverage disable`, "node:coverage disable"),
    // Other linters
    invalid(`// biome-ignore lint/style: reason`, "biome-ignore"),
    invalid(`// oxlint-disable-next-line no-console`, "oxlint-disable-next-line"),
    // Test files are not exempt
    invalid(`// @ts-expect-error`, "@ts-expect-error", "/project/src/core/foo.test.ts"),
    // A directory merely containing "_unsafe_" in its name is not enough
    invalid(`// @ts-ignore`, "@ts-ignore", "/project/src/core/not_unsafe_/foo.ts"),
    // Each directive is reported
    {
      code: `// @ts-ignore\nconst a = 1;\n/* c8 ignore next */\nconst b = 2;`,
      filename: outside,
      errors: [
        { messageId: "outsideUnsafeDir", data: { directive: "@ts-ignore" } },
        { messageId: "outsideUnsafeDir", data: { directive: "c8 ignore" } },
      ],
    },
  ],
});
